import React, { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import useIsBrowser from "@docusaurus/useIsBrowser";
import { useHistory, useLocation } from "@docusaurus/router";
import { translate } from "@docusaurus/Translate";
import { ReactContextError, useDocsPreferredVersion } from "@docusaurus/theme-common";
import { useActivePlugin } from "@docusaurus/plugin-content-docs/client";
import { fetchIndexesByWorker, searchByWorker } from "@easyops-cn/docusaurus-search-local/dist/client/client/theme/searchByWorker";
import { SuggestionTemplate } from "@easyops-cn/docusaurus-search-local/dist/client/client/theme/SearchBar/SuggestionTemplate";
import { EmptyTemplate } from "@easyops-cn/docusaurus-search-local/dist/client/client/theme/SearchBar/EmptyTemplate";
import { Mark, searchBarShortcut, searchBarShortcutKeymap, searchBarPosition, docsPluginIdForPreferredVersion, indexDocs, searchContextByPaths, hideSearchBarWithNoSearchContext, useAllContextsWithNoSearchContext } from "@easyops-cn/docusaurus-search-local/dist/client/client/utils/proxiedGenerated";
import LoadingRing from "@easyops-cn/docusaurus-search-local/dist/client/client/theme/LoadingRing/LoadingRing";
import { normalizeContextByPath } from "@easyops-cn/docusaurus-search-local/dist/client/client/utils/normalizeContextByPath";
import { searchResultLimits } from "@easyops-cn/docusaurus-search-local/dist/client/client/utils/proxiedGeneratedConstants";
import { parseKeymap, matchesKeymap } from "@easyops-cn/docusaurus-search-local/dist/client/client/utils/keymap";
import { isMacPlatform } from "@easyops-cn/docusaurus-search-local/dist/client/client/utils/platform";
import styles from "@easyops-cn/docusaurus-search-local/dist/client/client/theme/SearchBar/SearchBar.module.css";

async function fetchAutoCompleteJS() {
    const autoCompleteModule = await import("@easyops-cn/autocomplete.js");
    const autoComplete = autoCompleteModule.default;
    if (autoComplete.noConflict) {
        autoComplete.noConflict();
    }
    else if (autoCompleteModule.noConflict) {
        autoCompleteModule.noConflict();
    }
    return autoComplete;
}

const SEARCH_PARAM_HIGHLIGHT = "_highlight";

export default function SearchBar({ handleSearchBarToggle }) {
    const isBrowser = useIsBrowser();
    const { siteConfig: { baseUrl }, i18n: { currentLocale } } = useDocusaurusContext();
    const activePlugin = useActivePlugin();
    let versionUrl = baseUrl;

    try {
        const { preferredVersion } = useDocsPreferredVersion(activePlugin?.pluginId ?? docsPluginIdForPreferredVersion);
        if (preferredVersion && !preferredVersion.isLast) {
            versionUrl = preferredVersion.path + "/";
        }
    }
    catch (e) {
        if (indexDocs) {
            if (e instanceof ReactContextError) {
                /* ignore, happens when website doesn't use versions */
            }
            else {
                throw e;
            }
        }
    }

    const history = useHistory();
    const location = useLocation();
    const searchBarRef = useRef(null);
    const indexStateMap = useRef(new Map());
    const focusAfterIndexLoaded = useRef(false);
    const [loading, setLoading] = useState(false);
    const [inputChanged, setInputChanged] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const search = useRef(null);
    const prevSearchContext = useRef("");
    const [searchContext, setSearchContext] = useState("");
    const prevVersionUrl = useRef(baseUrl);

    useEffect(() => {
        if (!Array.isArray(searchContextByPaths)) {
            if (prevVersionUrl.current !== versionUrl) {
                indexStateMap.current.delete("");
                prevVersionUrl.current = versionUrl;
            }
            return;
        }
        let nextSearchContext = "";
        if (location.pathname.startsWith(versionUrl)) {
            const uri = location.pathname.substring(versionUrl.length);
            let matchedPath;
            for (const _path of searchContextByPaths) {
                const path = typeof _path === "string" ? _path : _path.path;
                if (uri === path || uri.startsWith(`${path}/`)) {
                    matchedPath = path;
                    break;
                }
            }
            if (matchedPath) {
                nextSearchContext = matchedPath;
            }
        }
        if (prevSearchContext.current !== nextSearchContext) {
            indexStateMap.current.delete(nextSearchContext);
            prevSearchContext.current = nextSearchContext;
        }
        setSearchContext(nextSearchContext);
    }, [location.pathname, versionUrl]);

    const hidden = !!hideSearchBarWithNoSearchContext &&
        Array.isArray(searchContextByPaths) &&
        searchContext === "";

    const loadIndex = useCallback(async () => {
        if (hidden || indexStateMap.current.get(searchContext)) {
            return;
        }
        indexStateMap.current.set(searchContext, "loading");
        search.current?.autocomplete.destroy();
        setLoading(true);

        const [autoComplete] = await Promise.all([
            fetchAutoCompleteJS(),
            fetchIndexesByWorker(versionUrl, searchContext),
        ]);

        const searchFooterLinkElement = ({ query, isEmpty }) => {
            const a = document.createElement("a");
            const params = new URLSearchParams();
            params.set("q", query);
            let linkText;
            if (searchContext) {
                const detailedSearchContext = searchContext && Array.isArray(searchContextByPaths)
                    ? searchContextByPaths.find((item) => typeof item === "string"
                        ? item === searchContext
                        : item.path === searchContext)
                    : searchContext;
                const translatedSearchContext = detailedSearchContext
                    ? normalizeContextByPath(detailedSearchContext, currentLocale).label
                    : searchContext;
                if (useAllContextsWithNoSearchContext && isEmpty) {
                    linkText = translate({
                        id: "theme.SearchBar.seeAllOutsideContext",
                        message: 'See all results outside "{context}"',
                    }, { context: translatedSearchContext });
                }
                else {
                    linkText = translate({
                        id: "theme.SearchBar.searchInContext",
                        message: 'See all results within "{context}"',
                    }, { context: translatedSearchContext });
                }
            }
            else {
                linkText = translate({
                    id: "theme.SearchBar.seeAll",
                    message: "See all results",
                });
            }
            if (searchContext &&
                Array.isArray(searchContextByPaths) &&
                (!useAllContextsWithNoSearchContext || !isEmpty)) {
                params.set("ctx", searchContext);
            }
            if (versionUrl !== baseUrl) {
                if (!versionUrl.startsWith(baseUrl)) {
                    throw new Error(`Version url '${versionUrl}' does not start with base url '${baseUrl}', this is a bug of \`@easyops-cn/docusaurus-search-local\`, please report it.`);
                }
                params.set("version", versionUrl.substring(baseUrl.length));
            }
            const url = `${baseUrl}search/?${params.toString()}`;
            a.href = url;
            a.textContent = linkText;
            a.addEventListener("click", (e) => {
                if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    search.current?.autocomplete.close();
                    history.push(url);
                }
            });
            return a;
        };

        search.current = autoComplete(searchBarRef.current, {
            hint: false,
            autoselect: true,
            openOnFocus: true,
            cssClasses: {
                root: clsx(styles.searchBar, {
                    [styles.searchBarLeft]: searchBarPosition === "left",
                }),
                noPrefix: true,
                dropdownMenu: styles.dropdownMenu,
                input: styles.input,
                hint: styles.hint,
                suggestions: styles.suggestions,
                suggestion: styles.suggestion,
                cursor: styles.cursor,
                dataset: styles.dataset,
                empty: styles.empty,
            },
        }, [
            {
                source: async (input, callback) => {
                    const result = await searchByWorker(versionUrl, searchContext, input, searchResultLimits);
                    callback(result);
                },
                templates: {
                    suggestion: SuggestionTemplate,
                    empty: EmptyTemplate,
                    footer: ({ query, isEmpty }) => {
                        if (isEmpty &&
                            (!searchContext || !useAllContextsWithNoSearchContext)) {
                            return;
                        }
                        const a = searchFooterLinkElement({ query, isEmpty });
                        const div = document.createElement("div");
                        div.className = styles.hitFooter;
                        div.appendChild(a);
                        return div;
                    },
                },
            },
        ])
            .on("autocomplete:selected", function (event, { document: { u, h }, tokens }) {
                searchBarRef.current?.blur();
                let url = u;
                if (Mark && tokens.length > 0) {
                    const params = new URLSearchParams();
                    for (const token of tokens) {
                        params.append(SEARCH_PARAM_HIGHLIGHT, token);
                    }
                    url += `?${params.toString()}`;
                }
                if (h) {
                    url += h;
                }
                history.push(url);
            })
            .on("autocomplete:closed", () => {
                searchBarRef.current?.blur();
            });

        indexStateMap.current.set(searchContext, "done");
        setLoading(false);
        if (focusAfterIndexLoaded.current) {
            const input = searchBarRef.current;
            if (input.value) {
                search.current?.autocomplete.open();
            }
            input.focus();
        }
    }, [hidden, searchContext, versionUrl, baseUrl, history, currentLocale]);

    useEffect(() => {
        if (!Mark) {
            return;
        }
        const keywords = isBrowser
            ? new URLSearchParams(location.search).getAll(SEARCH_PARAM_HIGHLIGHT)
            : [];
        setTimeout(() => {
            const root = document.querySelector("article");
            if (!root) {
                return;
            }
            const mark = new Mark(root);
            mark.unmark();
            if (keywords.length !== 0) {
                mark.mark(keywords, {
                    exclude: [".theme-doc-toc-mobile > button"],
                });
            }
            setInputValue(keywords.join(" "));
            search.current?.autocomplete.setVal(keywords.join(" "));
        });
    }, [isBrowser, location.search, location.pathname]);

    const [focused, setFocused] = useState(false);

    const onInputFocus = useCallback(() => {
        focusAfterIndexLoaded.current = true;
        loadIndex();
        setFocused(true);
        handleSearchBarToggle?.(true);
    }, [handleSearchBarToggle, loadIndex]);

    const onInputBlur = useCallback(() => {
        setFocused(false);
        handleSearchBarToggle?.(false);
    }, [handleSearchBarToggle]);

    const onInputMouseEnter = useCallback(() => {
        loadIndex();
    }, [loadIndex]);

    const onInputChange = useCallback((event) => {
        setInputValue(event.target.value);
        if (event.target.value) {
            setInputChanged(true);
        }
    }, []);

    useEffect(() => {
        const searchBar = searchBarRef.current;
        const domValue = searchBar?.value;
        if (domValue) {
            setInputValue(domValue);
        }
        if (searchBar && document.activeElement === searchBar) {
            focusAfterIndexLoaded.current = true;
            loadIndex();
            setFocused(true);
            handleSearchBarToggle?.(true);
        }
    }, [handleSearchBarToggle, loadIndex]);

    useEffect(() => {
        if (!searchBarShortcut || !searchBarShortcutKeymap) {
            return;
        }
        const parsedKeymap = parseKeymap(searchBarShortcutKeymap);
        const handleShortcut = (event) => {
            if (matchesKeymap(event, parsedKeymap)) {
                event.preventDefault();
                searchBarRef.current?.focus();
                onInputFocus();
            }
        };
        document.addEventListener("keydown", handleShortcut);
        return () => {
            document.removeEventListener("keydown", handleShortcut);
        };
    }, [onInputFocus, searchBarShortcutKeymap]);

    const onClearSearch = useCallback(() => {
        const params = new URLSearchParams(location.search);
        params.delete(SEARCH_PARAM_HIGHLIGHT);
        const paramsStr = params.toString();
        const searchUrl = location.pathname +
            (paramsStr != "" ? `?${paramsStr}` : "") +
            location.hash;
        if (searchUrl != location.pathname + location.search + location.hash) {
            history.push(searchUrl);
        }
        setInputValue("");
        search.current?.autocomplete.setVal("");
    }, [location.pathname, location.search, location.hash, history]);

    return (
        <div
            className={clsx("navbar__search", styles.searchBarContainer, {
                [styles.searchIndexLoading]: loading && inputChanged,
                [styles.focused]: focused,
            })}
            hidden={hidden}
            dir="ltr"
        >
            <input
                placeholder={translate({
                    id: "theme.SearchBar.label",
                    message: "Search",
                    description: "The ARIA label and placeholder for search button",
                })}
                aria-label="Search"
                className={`navbar__search-input ${styles.searchInput}`}
                onMouseEnter={onInputMouseEnter}
                onFocus={onInputFocus}
                onBlur={onInputBlur}
                onChange={onInputChange}
                ref={searchBarRef}
                value={inputValue}
            />
            <LoadingRing className={styles.searchBarLoadingRing}/>
            {inputValue !== "" ? (
                <button className={styles.searchClearButton} onClick={onClearSearch}>
                    ✕
                </button>
            ) : (
                <div className="search-icon-container">
                    <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14 14L11.1 11.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
            )}
        </div>
    );
}
