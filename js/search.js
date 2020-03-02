/**
 * Created & edited by SuperKieran (https://github.com/SuperKieran/TKL/blob/master/layout/_partial/search.ejs.
 * 
 * Modified slightly by Sariay (https://github.com/Sariay/hexo-theme-Annie).
 */

const themeLocalSearch = function({search_path, zip_Path, version_Path, input_Trigger, top_N}) {
    // Popup Window;
    var isfetched = false,
        isXml = true;

    // Search DB path;
    if (search_path.length === 0) {
        search_path = "search.xml";
    } else if (/json$/i.test(search_path)) {
        isXml = false;
    }

    // monitor main search box;
    var onPopupClose = function(e) {
        $('.popup').addClass('scale-out-horizontal').fadeOut(600);
		$('body').removeClass('body-fixed-search')
        $('#local-search-input').val('');
        $('.search-result-list').remove();
        $('#no-result').remove();
        $('.search-result-number').remove();
		
		setTimeout(function(){
			$('.popup').removeClass('scale-out-horizontal');
		}, 1000);
	}

    function proceedsearch() {
        $('.popup').addClass('scale-in-hor-center').fadeIn(600);
        
        var $localSearchInput = $('#local-search-input');
        $localSearchInput.attr("autocapitalize", "none");
        $localSearchInput.attr("autocorrect", "off");
        $localSearchInput.focus();
		
		setTimeout(function(){
			$('.popup').removeClass('scale-in-hor-center');		
			$('body').addClass('body-fixed-search');
		}, 1000);
    }

    // get search zip version and initialize  the search zip;
    $.get(version_Path + '?t=' + (+new Date()), function(res) {
        if (localStorage.getItem('searchVersion') !== res) {
            localStorage.setItem('searchVersion', res);
            initSearchJson();
        }
    });

    function initSearchJson() {
        initLoad([zip_Path], {
            loadOptions: {
                success: function(obj) {
                    localStorage.setItem('searchJson', obj[search_path])
                },
                error: function(e) {
                    return console.log(e)
                }
            },
            returnOptions: {
                'json': TYPE_TEXT
            },
            mimeOptions: {
                'json': 'application/json'
            }
        })
    }
    
	function fixedInputWhenScrolling() {
		var searchContainerId = '.local-search-popup',
			searchInputId = '#local-search-input',
			searchInputPromptH = $(".input-prompt").outerHeight();
		
		$(searchContainerId).scroll(function() {
			var scrollTop = $(searchContainerId).scrollTop();
		
			if(scrollTop >= searchInputPromptH/2) {				
				$(searchInputId).addClass('input-fixed');
			} else {
				$(searchInputId).removeClass('input-fixed');
			}
		}).trigger('scroll');
	}
	
	
	function clearScroll() {
		var searchContainerId = '.local-search-popup',
			scrollSpeed = 5; //shoud be small value! 
		
		$(searchContainerId).animate({
			scrollTop: 0
		}, scrollSpeed);	
	}
   
	
    // search function;
    var searchFunc = function(search_id, content_id) {
    		
        'use strict';
        isfetched = true;
        var datas = JSON.parse(localStorage.getItem('searchJson'));
        console.log(search_id)
        var input = document.getElementById(search_id);
        var resultContent = document.getElementById(content_id);
        var inputEventFunction = function() {
        	// TODO
        	clearScroll(); 
        	                   	
            var searchText = input.value.trim().toLowerCase();
            var keywords = searchText.split(/[\s\-]+/);
            if (keywords.length > 1) {
                keywords.push(searchText);
            }
            var resultItems = [];
            if (searchText.length > 0) {
                // perform local searching
                datas.forEach(function(data) {
                    var isMatch = false;
                    var hitCount = 0;
                    var searchTextCount = 0;
                    var title = data.title ? data.title.trim() : '';
                    var titleInLowerCase = title.toLowerCase();
                    var content = data.content ? data.content.trim().replace(/<[^>]+>/g, "") : '';
                    var contentInLowerCase = content.toLowerCase();
                    var articleUrl = decodeURIComponent(data.url);
                    var indexOfTitle = [];
                    var indexOfContent = [];
                    // only match articles with not empty titles
                    keywords.forEach(function(keyword) {
                        function getIndexByWord(word, text, caseSensitive) {
                            var wordLen = word.length;
                            if (wordLen === 0) {
                                return [];
                            }
                            var startPosition = 0,
                                position = [],
                                index = [];
                            if (!caseSensitive) {
                                text = text.toLowerCase();
                                word = word.toLowerCase();
                            }
                            while ((position = text.indexOf(word, startPosition)) > -1) {
                                index.push({
                                    position: position,
                                    word: word
                                });
                                startPosition = position + wordLen;
                            }
                            return index;
                        }

                        indexOfTitle = indexOfTitle.concat(getIndexByWord(keyword, titleInLowerCase, false));
                        indexOfContent = indexOfContent.concat(getIndexByWord(keyword, contentInLowerCase, false));
                    });
                    if (indexOfTitle.length > 0 || indexOfContent.length > 0) {
                        isMatch = true;
                        hitCount = indexOfTitle.length + indexOfContent.length;
                    }

                    // show search results
                    if (isMatch) {
                        // sort index by position of keyword
                        [indexOfTitle, indexOfContent].forEach(function(index) {
                            index.sort(function(itemLeft, itemRight) {
                                if (itemRight.position !== itemLeft.position) {
                                    return itemRight.position - itemLeft.position;
                                } else {
                                    return itemLeft.word.length - itemRight.word.length;
                                }
                            });
                        });

                        // merge hits into slices
                        function mergeIntoSlice(text, start, end, index) {
                            var item = index[index.length - 1];
                            var position = item.position;
                            var word = item.word;
                            var hits = [];
                            var searchTextCountInSlice = 0;
                            while (position + word.length <= end && index.length != 0) {
                                if (word === searchText) {
                                    searchTextCountInSlice++;
                                }
                                hits.push({
                                    position: position,
                                    length: word.length
                                });
                                var wordEnd = position + word.length;

                                // move to next position of hit
                                index.pop();
                                while (index.length != 0) {
                                    item = index[index.length - 1];
                                    position = item.position;
                                    word = item.word;
                                    if (wordEnd > position) {
                                        index.pop();
                                    } else {
                                        break;
                                    }
                                }
                            }
                            searchTextCount += searchTextCountInSlice;
                            return {
                                hits: hits,
                                start: start,
                                end: end,
                                searchTextCount: searchTextCountInSlice
                            };
                        }

                        var slicesOfTitle = [];
                        if (indexOfTitle.length != 0) {
                            slicesOfTitle.push(mergeIntoSlice(title, 0, title.length, indexOfTitle));
                        }

                        var slicesOfContent = [];
                        while (indexOfContent.length != 0) {
                            var item = indexOfContent[indexOfContent.length - 1];
                            var position = item.position;
                            var word = item.word;
                            // cut out 100 characters
                            var start = position - 20;
                            var end = position + 80;
                            if (start < 0) {
                                start = 0;
                            }
                            if (end < position + word.length) {
                                end = position + word.length;
                            }
                            if (end > content.length) {
                                end = content.length;
                            }
                            slicesOfContent.push(mergeIntoSlice(content, start, end, indexOfContent));
                        }

                        // sort slices in content by search text's count and hits' count
                        slicesOfContent.sort(function(sliceLeft, sliceRight) {
                            if (sliceLeft.searchTextCount !== sliceRight.searchTextCount) {
                                return sliceRight.searchTextCount - sliceLeft.searchTextCount;
                            } else if (sliceLeft.hits.length !== sliceRight.hits.length) {
                                return sliceRight.hits.length - sliceLeft.hits.length;
                            } else {
                                return sliceLeft.start - sliceRight.start;
                            }
                        });

                        // select top N slices in content
                        var upperBound = parseInt(top_N);
                        if (upperBound >= 0) {
                            slicesOfContent = slicesOfContent.slice(0, upperBound);
                        }

                        // highlight title and content
                        function highlightKeyword(text, slice) {
                            var result = '';
                            var prevEnd = slice.start;
                            slice.hits.forEach(function(hit) {
                                result += text.substring(prevEnd, hit.position);
                                var end = hit.position + hit.length;
                                result += '<b class="search-keyword">' + text.substring(hit.position, end) + '</b>';
                                prevEnd = end;
                            });
                            result += text.substring(prevEnd, slice.end);
                            return result;
                        }

                        var resultItem = '';

                        if (slicesOfTitle.length != 0) {
                            resultItem += "<li><a target='_blank' href='" + articleUrl + "' class='search-result-title'>" + highlightKeyword(title, slicesOfTitle[0]) + "</a>";
                        } else {
                            resultItem += "<li><a target='_blank' href='" + articleUrl + "' class='search-result-title'>" + title + "</a>";
                        }

                        slicesOfContent.forEach(function(slice) {
                            resultItem += "<p class=\"search-result-content\">" + highlightKeyword(content, slice) + "...</p>";
                        });

                        resultItem += "</li>";
                        resultItems.push({
                            item: resultItem,
                            searchTextCount: searchTextCount,
                            hitCount: hitCount,
                            id: resultItems.length
                        });
                    }
                })
            };
            if (keywords.length === 1 && keywords[0] === "") {
                resultContent.innerHTML = '<div id="no-result"><i class="" />Please type in some words!</div>'
            } else if (resultItems.length === 0) {
                resultContent.innerHTML = '<div id="no-result"><i class="" />No any results!</div>'
            } else {
                resultItems.sort(function(resultLeft, resultRight) {
                    if (resultLeft.searchTextCount !== resultRight.searchTextCount) {
                        return resultRight.searchTextCount - resultLeft.searchTextCount;
                    } else if (resultLeft.hitCount !== resultRight.hitCount) {
                        return resultRight.hitCount - resultLeft.hitCount;
                    } else {
                        return resultRight.id - resultLeft.id;
                    }
                });
                var searchResultList = '<div class=\"search-result-number"\>' + resultItems.length + ' results at total!</div>' + '<ul class=\"search-result-list\">';
                resultItems.forEach(function(result) {
                    searchResultList += result.item;
                })
                searchResultList += "</ul>";
                resultContent.innerHTML = searchResultList;
            }
        }

        if ('auto' === input_Trigger) {
            input.addEventListener('input', inputEventFunction);
        } else {
            //$('.search-icon').click(inputEventFunction);
            input.addEventListener('keypress', function(event) {
                if (event.keyCode === 13) {
                    inputEventFunction();
                }
            });
        }

        proceedsearch(); 
    }

    // handle and trigger popup window;
    $('.popup-trigger').click(function(e) {
        e.stopPropagation();
        if (isfetched === false) {
            $('.sb-close').click();
            searchFunc('local-search-input', 'local-search-output');
        } else {
            proceedsearch();
        };
    });

    $('.popup-btn-close').click(onPopupClose);
    $('.popup').click(function(e) {
        e.stopPropagation();
    });
    $(document).on('keyup', function(event) {
        var shouldDismissSearchPopup = event.which === 27 &&
            $('.search-popup').is(':visible');
        if (shouldDismissSearchPopup) {
            onPopupClose();
        }
    });
    
    // TODO
    fixedInputWhenScrolling();
};