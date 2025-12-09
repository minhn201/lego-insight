var RB = RB || {};
var g_polling_timer = null;

$(function() {

    RB.spinner = '<div class="cssload-container"><div class="cssload-speeding-wheel spinner"></div></div>';
    RB.spinner_sm = RB.spinner.replace('spinner', 'spinner-sm');
    RB.spinner_xs = '<span class="inline-block"><div class="cssload-container"><div class="cssload-speeding-wheel spinner-xs"></div></div></span>';

    var selector_body = $('body');

    /*
    IE Fixes
    --------
    */

    // Add startsWith support if missing
    if (!String.prototype.startsWith) {
        String.prototype.startsWith = function(searchString, position) {
            position = position || 0;
            return this.indexOf(searchString, position) === position;
        };
    }


    /*
    iPad Fixes
    ----------
    */

    var g_is_iPad = navigator.userAgent.match(/iPad/i) != null;
    RB.fixiPadForms = function() {
        // console.log(g_is_iPad);
        if (g_is_iPad) {
            // Disable for POSTing to _blank as it is blocked by default on iPad Safari
            $('form').each(function () {
                // console.log($(this).attr('action'));
                $(this).attr('target', '_self');
            });
        }
    };
    RB.fixiPadForms();

    RB.get_width = function() {
        // https://stackoverflow.com/questions/3437786/get-the-size-of-the-screen-current-web-page-and-browser-window
        var w = window,
            d = document,
            e = d.documentElement,
            g = d.getElementsByTagName('body')[0],
            x = w.innerWidth || e.clientWidth || g.clientWidth;
        return x;
    }


    /*
    Util Functions
    --------------
    */

    var g_active_step = 0;
    RB.activate_step = function(active_step) {
        // If the tab is a step in a wizard, automatically enable that step
        if (g_active_step < active_step) {
            g_active_step = active_step;
            $('.process-wizard-step').each(function (idx, step) {
                if ($(step).data('step') <= active_step) {
                    $(step).removeClass('disabled').addClass('complete');
                } else {
                    $(step).removeClass('complete').addClass('disabled');
                }
            });
            window.scrollTo(0, 0);
        }
    };

    function tryParseJSON(jsonString) {
        try {
            var o = JSON.parse(jsonString);

            // Handle non-exception-throwing cases:
            // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
            // but... JSON.parse(null) returns 'null', and typeof null === "object",
            // so we must check for that, too.
            if (o && typeof o === "object" && o !== null) {
                return o;
            }
        }
        catch (e) {
            //console.log(e);
        }

        return false;
    }

    function getFormJSON($form) {
        var unindexed_array = $form.serializeArray();
        var indexed_array = {};

        $.map(unindexed_array, function(n, i){
            indexed_array[n['name']] = n['value'];
        });

        return indexed_array;
    }

    RB.getURLParams = function(str) {
        // https://stackoverflow.com/questions/10126956/capture-value-out-of-query-string-with-regex
        var queryString = str || window.location.search || '';
        var keyValPairs = [];
        var params      = {};
        queryString     = queryString.replace(/.*?\?/,"");

        if (queryString.length) {
            keyValPairs = queryString.split('&');
            for (var pairNum in keyValPairs) {
                var key = keyValPairs[pairNum].split('=')[0];
                if (!key.length) continue;
                if (typeof params[key] === 'undefined')
                params[key] = [];
                params[key].push(keyValPairs[pairNum].split('=')[1]);
            }
        }
        // Note each param is returned as an array, so just grab [0]
        return params;
    };

    RB.getURLParam = function(param) {
        var params = RB.getURLParams(decodeURIComponent(location.search));
        if (typeof params[param] === 'undefined') {
            return '';
        } else {
            return params[param];
        }
    }

    RB.replaceURLParam = function(url, paramName, paramValue) {
        var pattern = new RegExp('\\b('+paramName+'=).*?(&|$)');
        if (url.search(pattern) >= 0) {
            return url.replace(pattern,'$1' + paramValue + '$2');
        } else {
            return url + (url.indexOf('?') > -1 ? '&' : '?') + paramName + '=' + paramValue;
        }
    };

    RB.removeURLParam = function(paramName) {
        // decodeURIComponent ensures we don't double-encode the params via multiple calls to RB.removeURLParam
        var params = RB.getURLParams(decodeURIComponent(location.search));
        if (g_debug) console.log('Removing ' + paramName + ' from ', params);
        delete(params[paramName]);
        var new_search = $.param(params, true);  // true avoids adding [] to param names, uses encodeURIComponent
        var new_url = location.pathname; // need to include pathname or replaceState won't work on removing only param leaving empty string
        if (new_search.length > 0) {
            new_url = new_url + '?' + decodeURIComponent(new_search);
        }
        if (location.hash.length > 0) {
            new_url += location.hash;
        }
        history.replaceState(null, null, new_url);
        if (g_debug) console.log('Removed ' + paramName + ' left ' + new_url);
        return new_url;
    };

    $.fn.serializeObject = function() {
        var o = {};
        var a = this.serializeArray();
        $.each(a, function() {
            if (o[this.name]) {
                if (!o[this.name].push) {
                    o[this.name] = [o[this.name]];
                }
                o[this.name].push(this.value || '');
            } else {
                o[this.name] = this.value || '';
            }
        });
        return o;
    };

    RB.copy_to_clipboard = function(text) {
        // https://stackoverflow.com/questions/22581345/click-button-copy-to-clipboard
        navigator.clipboard.writeText(text).then(
            function() {
                // worked
                console.log('copied text');
            },
            function() {
                // old way
                console.log('copy failed, trying old crappy way');
                var $temp = $("<input>");
                $("body").append($temp);
                $temp.val(text).select();
                document.execCommand("copy");
                $temp.remove();
            }
        );
    };

    RB.to_user_currency = function(price) {
        return price.toLocaleString('en-US', {style: "currency", currency: g_user_currency, minimumFractionDigits: 2});
    };

    RB.ga_transaction = function(ga_group, amount, currency, category, item) {
        // Log ecommerce transaction in google analytics
        /*console.log(amount);
        console.log(currency);
        console.log(category);
        console.log(item);*/

        gtag('event', 'purchase', {
            'event_label': item,
            'send_to': ga_group,
            "transaction_id": category,
            "value": amount,
            "currency": currency,
            "items": [{
                "id": "1",
                "name": item,
                "category": category,
                "quantity": 1,
                "price": amount
            }]
        });

        /*ga('require', 'ecommerce');
        ga('ecommerce:addTransaction', {
            'id': '1234',
            'revenue': amount,
            'currency': currency
        });
        ga('ecommerce:addItem', {
            'id': '1234',
            'name': item,
            'category': category,
            'price': amount,
            'quantity': '1'
        });
        ga('ecommerce:send');*/
    };

    RB.getRandomHash = function() {
        return Math.random().toString(36).substring(2);
    }

    // Load Modal but first load and prepare external js eg highcharts
    selector_body.on('click', '.js-load-modal-w-script', function() {
        var btn = $(this);
        if (!($(btn.data('modal')).data('bs.modal') || {}).isShown) {
            if (btn.data('modaltitle')) {
                $(btn.data('modal')).find('.modal-title').html(btn.data('modaltitle'));
            };
            $(btn.data('modal')).modal();
        }
        if (!window.Highcharts) {
            loadScript(btn.data('script'), function () {
                // Now load modal contents
                RB.get_ajax({elem: $(btn.data('elem')), url: btn.data('url'), data: btn.data('data')});
                return false;
            });
        } else {
            RB.get_ajax({elem: $(btn.data('elem')), url: btn.data('url'), data: btn.data('data')});
            return false;
        }
    });

    // Make modals draggable by the header
    selector_body.on('mousedown', '.modal-header', function(mousedownEvt) {
        var $draggable = $(this);
        var x = mousedownEvt.pageX - $draggable.offset().left,
            y = mousedownEvt.pageY - $draggable.offset().top;
        selector_body.on("mousemove.draggable", function(mousemoveEvt) {
            $draggable.closest(".modal-dialog").offset({
                "left": mousemoveEvt.pageX - x,
                "top": mousemoveEvt.pageY - y
            });
        });
        selector_body.one("mouseup", function() {
            $("body").off("mousemove.draggable");
        });
        $draggable.closest(".modal").one("bs.modal.hide", function() {
            $("body").off("mousemove.draggable");
        });
    });

    RB.is_modal_shown = function() {
        //console.log($('.modal'));
        var is_shown = false;
        $('.modal').each(function() {
            //console.log(this);
            //console.log(($(this).data('bs.modal') || {}).isShown);
            if (($(this).data('bs.modal') || {}).isShown) {
                is_shown = true;
                return false;  // just breaks the loop not the function... i hate js
            }
        });
        return is_shown;
    }

    // Keyboard shortcuts
    selector_body.keypress(function(e) {
        var c = String.fromCharCode(e.which);
        if (g_isadmin) { // while we are testing
            if (c === 't') {
                //console.log($(e.target));
                // not inside a form, not a input, not select2, no in blogeditor (tox-dialog/mce-content-body), not on another modal
                if ($(e.target).parents('form').length === 0 && !$(e.target).hasClass('form-control') && !$(e.target).is('input') && $(e.target).parents('.select2-container').length === 0 && $(e.target).parents('.tox-dialog').length === 0 && !$(e.target).hasClass('mce-content-body') && !RB.is_modal_shown()) {
                    // Add Tag popup
                    $('#add_tag').trigger('click');
                }
            }
        }
    });

    /*
    Search Box
    -----------
    */

    // Fix the css selector
    $('#header li.search, #header li.search i').click(function () {
        var search_box = $(this).parents('ul').find('.search-box').first();
        if (search_box.is(":visible")) {
            search_box.hide();
        } else {
            search_box.show();
            console.log(search_box.find('form input[name=q]'));
            search_box.find('form input[name=q]').first().focus();
        }
    });

    // close search box on body click
    if ($('#header li.search').length != 0) {
        $('#header .search-box, #header li.search, #header li.search i').on('click', function(e){
            e.stopPropagation();
        });

        $('body').on('click', function() {
            if($('#header li.search .search-box').is(":visible")) {
                $('#header .search-box').fadeOut(300);
            }
        });
    }

    $(document).bind("click", function() {
        if($('#header li.search .search-box').is(":visible")) {
            $('#header .search-box').fadeOut(300);
        }
    });


    // Close Fullscreen Search
    $("#closeSearch").bind("click", function(e) {
        e.preventDefault();

        $('#header .search-box').fadeOut(300);
    });

    // Show global search slide down
    $('#global_search').on('shown.bs.collapse', function() {
        $(this).find('form input[name=q]').first().focus();
    });
    selector_body.on('shown.bs.tab', '.nav-tabs a', function() {
        // If this tab has a search query input, give it focus
        $($(this).attr('href')+' form input[name=q]').focus();
    });
    // Change search type
    $('.search-global select[name=search_type]').on('change', function() {
        // Update auto-suggest URL with selected filter type
        var val = $(this).val();
        var base_url = $(this).siblings('.autosuggest').attr('data-queryURL');
        base_url = base_url.substring(0, base_url.length-2);
        var st = base_url.indexOf('st=');
        if (st > -1) {
            base_url = base_url.substring(0, st);
        }
        $(this).siblings('.autosuggest').attr('data-queryURL', base_url + 'st=' + val + '&q=');
        // Trigger new search
        var ta = $(this).siblings('.autosuggest').find('.typeahead.tt-input');
        var text = ta.typeahead('val');
        ta.typeahead('val', '');
        ta.typeahead('val', text).trigger("input").typeahead('open');
    });

    /*
    Menu Stuff
    -----------
    */

    $('#header nav.main-nav').on('rb-menu-open', function() {
        //console.log('rb-menu-open');
        /* video ad covers mobile menu, hide it */
        $('#tyche_trendi_parent_container>div').hide();
    });
    $('#header nav.main-nav').on('rb-menu-close', function() {
        //console.log('rb-menu-close');
        $('#tyche_trendi_parent_container>div').show();
    });

    /*
    Modal Stuff
    -----------
    */

    // Allow multiple modals to display properly
    // http://stackoverflow.com/questions/19305821/multiple-modals-overlay
    $(document).on('show.bs.modal', '.modal', function () {
        var zIndex = 1040 + (10 * $('.modal:visible').length);
        $(this).css('z-index', zIndex);
        setTimeout(function() {
            $('.modal-backdrop').not('.modal-stack').css('z-index', zIndex - 1).addClass('modal-stack');
        }, 0);
    });

    // When closing a modal and one is still visible, leave scroll bar intact
    $(document).on('hidden.bs.modal', '.modal', function () {
        $('.modal:visible').length && $(document.body).addClass('modal-open');
        //console.log('closing modal');
        // TODO: detect if modal has information we don't want to lose, eg message text, import results
        //       and dont close, or prompt to confirm.
    });

    RB.show_confirm_modal = function(title, html, yestext, notext, done_fn) {
        // Show a customisable yes/no modal prompt
        if (title) {
            $('#confirm_modal').find('.modal-title').html(title);
        }
        $('#confirm_modal .modal-body').html(html);
        if (yestext) {
            $('#confirm_modal_yes').html(yestext);
        }
        if (notext) {
            $('#confirm_modal_no').html(notext);
        }
        $('#confirm_modal').modal();
        $('#confirm_modal_yes').off('click').on('click', function(data) {
            if (done_fn) {
                done_fn(data);
                return false; // dont close modal
            }
        });
    };

    RB.confirm_delete = function(html, yestext, done_fn) {
        $('#confirm_modal').find('.modal-title').html('Are you sure?');
        $('#confirm_modal .modal-body').html(html);
        if (yestext) {
            $('#confirm_modal_yes').html(yestext);
        }
        $('#confirm_modal').modal();
        $('#confirm_modal_yes').off('click').on('click', function(data) {
            if (done_fn) {
                done_fn(data);
            }
        });
    };

    // Confirm delete (replace js-post-button with js-confirm-delete)
    selector_body.on('click', '.js-confirm-delete', function(data) {
        // Requires data fields: url, html, yestext (optional), ajax (optional)
        var btn = $(this);
        url = btn.data('url');

        RB.confirm_delete(btn.data('html'), btn.data('yestext'), function(data) {
            if (btn.data('ajax')) {
                RB.post_ajax({'url': url, 'elem': btn}, function(data) {
                    $('.modal').modal('hide');
                });
            } else {
                location.href = url;
            }
        });

        return false; // so links don't trigger
    });


    /*
    Handle Tab Changes/Linking
    ---------------------------
    */

    RB.scroll_to = function(scroll_to) {
        location.replace(document.location.hash.replace('_scroll', '')); // this syntax leaves history intact
        $('html').animate({
                scrollTop: scroll_to - 100 + 'px', // Take fixed header into consideration
            }, 'fast'
        );
    };

    RB.scroll_to_target = function(elem) {
        // Scroll to the top of the specified element. Note that scrolling may push the element down due to lazy loading
        // so do it iteratively.
        var scroll_to = elem.offset().top;
        //console.log('start scroll_to_target ' + scroll_to);
        location.replace(document.location.hash.replace('_scroll', '')); // this syntax leaves history intact
        $('html').animate({
                scrollTop: scroll_to - 100 + 'px', // Take fixed header into consideration
            }, 'fast', complete=function() {
                // check position and do it again if not there yet (eg lazy loaded images pushed target down)
                //console.log('done scroll_to_target '+ $('html').scrollTop());
                if (elem.offset().top != scroll_to) {
                    // target element has moved. Wait a bit to try again, give images time to load.
                    window.setTimeout(function() {RB.scroll_to_target(elem);}, 10);
                }
            }
        );
    };

    // Show a tab if the URL contains it's hash eg /settings/#parts
    RB.go_to_tab = function() {
        // Adding .nav-no-hash to the tabs prevents the tabs from changing the URL hash
        //console.log('RB.go_to_tab');
        try {
            var do_scroll = document.location.hash.substr(-7, 7) == '_scroll';
            var tab = $('.nav-tabs:not(.nav-no-hash) a[href=\\#tab_' + document.location.hash.replace('_scroll', '').replace('#', '') + ']');
            //console.log(tab);
            //var scroll_to = 0;
            var scroll_target;
            //if (g_debug) console.warn('go_to_tab - hash = ' + document.location.hash);
            if (document.location.hash.startsWith('#c') && document.location.hash != '#comments' && document.location.hash != '#changes') {
                //console.log('comment');
                tab = $('.nav-tabs:not(.nav-no-hash) a[href=\\#tab_comments]');
                do_scroll = true;
            } else if (tab.length > 0) {
                //console.log('tab');
                //scroll_to = tab.parents('.nav-tabs:not(.nav-no-hash)').offset().top;
                scroll_target = tab.parents('.nav-tabs:not(.nav-no-hash)');
            }
            if ($(document.location.hash.replace('_scroll', '')).length > 0) {
                //scroll_to = $(document.location.hash.replace('_scroll', '')).offset().top;
                scroll_target = $(document.location.hash.replace('_scroll', ''));
            }
            //console.log('scroll_to='+scroll_to);
            if (tab) {
                //console.log(tab.is(":hidden"));
                //if (tab.is(":hidden")) {
                    // dont want to trigger shown.bs.tab twice
                    tab.tab('show');
                //}
                tab.trigger('loadajaxdata'); // My custom event to load inventories etc on tab change
                tab.lazyLoadXT(); // lazy load images on tab
            }
            if (do_scroll && scroll_target) {
                //RB.scroll_to(scroll_to);
                RB.scroll_to_target(scroll_target);
            }
            //console.log(document.location.hash);
            if (document.location.hash.substr(1, 4) == 'step') {
                RB.activate_step(document.location.hash.substr(5, 1));
            }
        } catch (err) {
            console.log('Error in go_to_tab: '+err);
            console.log(err.stack);
        }
    };

    var g_highlighted_comment = '';
    RB.highlight_comment = function() {
        // Hihglight comment (pass in the element id to highlight)
        if (g_highlighted_comment) {
            if (g_debug) console.log('highlighting comment ' + g_highlighted_comment);
            var do_scroll = g_highlighted_comment.substr(-7, 7) == '_scroll';
            $(g_highlighted_comment.replace('_scroll', '')).addClass('border-left-green border-top-green padding-3');
            if (do_scroll) {
                var scroll_to = $(g_highlighted_comment.replace('_scroll', '')).offset().top;
                RB.scroll_to(scroll_to);
            }
        }
    };

    // Catch hash change triggered by something other than changing the tab
    $(window).on('hashchange', function() {
        //console.log('hashchange');
        RB.go_to_tab();
    });

    RB.change_hash_no_history = function(new_hash) {
        history.replaceState(null, null, new_hash); // change hash without affecting history
        // replaceState doesn't trigger hashchange event so do it manually
        $(window).trigger('hashchange');
    }

    // Change hash on tab change for bookmarking/page-reload
    // Adding .nav-no-hash to the tabs prevents the tabs from changing the URL hash
    $('.nav-tabs:not(.nav-no-hash) a').on('shown.bs.tab', function (e) {
        // First save existing hash which is lost on pages with tabs (eg comment highlight, others?)
        if (document.location.hash.startsWith('#c') && document.location.hash != '#comments' && document.location.hash != '#changes') {
            g_highlighted_comment = document.location.hash;
        }
        if ($(this).hasClass('process-wizard-dot')) {
            // Adds entry to browser history but using replaceState for wizard tabs breaks it for some unknown reason
            window.location.hash = e.target.hash.replace("#tab_", "#");
        } else {
            RB.change_hash_no_history(e.target.hash.replace("#tab_", "#"));
        }
        RB.fixSelect2(); // for select2's on hidden tabs
    });


    // Load tab's contents via ajax when selected
    RB.load_ajax_tab = function(tab, url, elem) {
        if (tab.data('loaded') != '1' && tab.data('loading') != '1') {
            tab.attr('data-loading', '1');
            RB.get_ajax({url: url, elem: elem}).done(function(data) {
                tab.attr('data-loaded', '1');
                tab.attr('data-loading', '0');
            });
        }
    };


    /*
    JQuery extensions
    -----------------
    */

    // Replace an element's contents with the Spinner
    // http://stackoverflow.com/questions/2640500/how-do-i-add-a-function-to-an-element-via-jquery
    $.fn.spin = function() {
        return this.each(function() {
            //$(this).addClass('spinner-overlay');
            $(this).attr('orig_html', $(this).html());
            $(this).attr('orig_width', $(this).width());
            $(this).attr('orig_height', $(this).height());
            if ($(this).height() > 1 && $(this).height() <= 22) {
                // Set icons, Workbench like btn
                $(this).html(RB.spinner_xs);
            } else if ($(this).height() > 1 && $(this).height() < 26) {
                // Small buttons
                $(this).html(RB.spinner_sm);
            } else {
                // Standard buttons, modals, etc
                $(this).html(RB.spinner);
            }
            if ($(this).attr('orig_height') > 0) {
                // Don't let spinner change element size too much
                $(this).width($(this).attr('orig_width'));
                $(this).height($(this).attr('orig_height'));
            }
            if ($(this).hasClass('btn')) {
                // Avoid double-posting
                $(this).attr('disabled', 'disabled');
            }
        });
    };

    // Restore an element's contents to it's original html
    $.fn.unspin = function() {
        return this.each(function() {
            $(this).html($(this).attr('orig_html'));
            $(this).removeAttr('orig_html');
            // TODO: auto is shrinking some buttons, but using data screws up Follow button
            if ($(this).attr('orig_width') > 0) {
                $(this).width($(this).attr('orig_width')); // set to orig size
                $(this).css("width", ""); // remove the hardcoded style
            } else {
                $(this).width('auto');
            }
            if ($(this).attr('orig_height') > 1) {
                // Let loaded content auto-size it's height
                $(this).height($(this).attr('orig_height'));
                $(this).css("height", ""); // remove the hardcoded style
            } else {
                $(this).height('auto');
            }
            if ($(this).hasClass('btn')) {
                $(this).removeAttr('disabled');
            }
            //$(this).removeClass('spinner-overlay');
        });
    };


    /*
    Generic stuff used everywhere
    -----------------------------
    */

    RB.initStickyTableHeader = function() {
        // My version handles fixed size tables eg user parts matrix but not full screen eg multibuy
        // Don't need to add js-table-sticky-header but include that makes the header smoother on firefox/safari
        // Chrome scrolls smoothly, Firefox sucks.
        $('.table-sticky-wrapper').scroll(function(e) {
            var x = $(this).scrollLeft();
            var y = $(this).scrollTop();
            //console.log(x, y);
            var thead = $(this).find('table thead');
            thead.css("top", y);
            thead.find('th:nth-child(1)').css("left", x);
            var tbody = $(this).find('table tbody');
            tbody.find('td:nth-child(1)').css("left", x);
        });

        // http://mkoryak.github.io/floatThead/
        loadScript('/static/plugins/floatThead/jquery.floatThead.min.js?v=2.2.1', function () {
            var options = {
                top: 60,
                zIndex: 999, // sticky menu header is 1000
                position: 'absolute',
                responsiveContainer: function ($table) {
                    // For horizontal scrolling
                    //if ($table.closest('.table-responsive').length > 0) {
                    //    return $table.closest('.table-responsive');
                    //} else {
                    return $table.closest('.table-sticky-wrapper');
                    //}
                },
            };
            $.each($('.js-table-sticky-header'), function (index, value) {
                $(this).floatThead('destroy');
                var is_in_scroll = $(this).data('is_in_scroll');
                if (is_in_scroll) {
                    // Wrapped in a fixed size container eg parts matrix
                    //options.scrollContainer = true;
                    options.scrollContainer = function ($table) {
                        // You must specify a container element inside of which the table will scroll.
                        // This element must already exist in the DOM and wrap the table.
                        //if ($table.closest('.table-responsive').length > 0) {
                        //    return $table.closest('.table-responsive');
                        //} else {
                        return $table.closest('.table-sticky-wrapper');
                        //}
                    };
                }
                $(this).floatThead(options);
            });
        });
    };

    RB.fixSelect2 = function() {
        // Re-init any select2 dropdowns that may have been hidden the first time
        if ($('.select2').length > 0) {
            loadScript(plugin_path + 'select2/js/select2.min.js', function () {
                try {
                    // Fix for select2 dropdowns within Bootstrap modal
                    // http://stackoverflow.com/questions/18487056/select2-doesnt-work-when-embedded-in-a-bootstrap-modal
                    $.fn.modal.Constructor.prototype.enforceFocus = function () {};

                    // Init
                    $.each($('.select2'), function (index, value) {
                        // Only apply it once in case this gets run multiple times
                        if (!$(value).hasClass('select2-container')) {
                            $(value).select2();
                        }
                    });
                    //$('.select2').select2();
                    // Override default CSS for select2 dropdowns used in Smarty template (requires select2.full.min.js)
                    //$('form select[name=theme]').select2({dropdownCssClass: 'wide_select2_dropdown'});
                    //$('form select[name=part_cat]').select2({dropdownCssClass: 'wide_select2_dropdown'});
                } catch (err) {
                    // I don't get why it does this when I obviously have just loaded the script
                    console.log('select2 probably not loaded');
                }
            });
        }
    };
    //RB.fixSelect2();

    // Clicking a selection will highlight the relevant radio button
    selector_body.on('click', '.js-select-radio', function() {
        $($(this).data('radio')).prop('checked', 'checked');
    });

    // Used to disable form submit buttons you don't want accidentally submitting twice from double-clicks
    selector_body.on('click', '.js-disable-on-submit', function() {
        var btn = $(this);
        $(this).parents('form').first().on('submit', function() {
            // Allow any form to submit and then disable button (or form won't submit!)
            setTimeout(function(){
                btn.spin();  // spin also disables
            }, 0);
        });
    });

    selector_body.on('change', 'select.js-canned-reject-reason', function() {
        // selected a pre-written response
        var textarea = $($(this).data('textarea'));
        if (textarea.hasClass('bbcode-done')) {
            var instance = sceditor.instance(textarea[0]);
            instance.insert($(this).val());
        } else {
            textarea.val($(this).val());
        }
    });

    // Apply BBCode editor to any textarea's with the bbcode class.
    // new: https://www.sceditor.com/documentation/getting-started/
    // Also need to setup tags in bbcode_tags.py
    RB.setBBCode = function(buttons) {
        if (typeof sceditor == "undefined") {
            // not loaded for anon users
            return;
        }
        $(".bbcode").each(function(index) {
            // copy from bbcode.js and customise tags
            // TODO how to get max_w/max_h from textarea via dragdrop
            // Just default to 800? and let comments css set width to 500
            // CSS in rebrickable.css .comment img.img-fluid uses 500px
            // Was 800x450 but need larger for SR images
            var max_w = 1000;
            var max_h = 800;
            // a bunch of stuff copied from dragdrop plugin as I couldn't figure out how to reuse or modify it :(
            var loadingGif = 'data:image/gif;base64,R0lGODlhlgBkAPABAH19ffb29iH5BAAKAAAAIf4aQ3JlYXRlZCB3aXRoIGFqYXhsb2FkLmluZm8AIf8LTkVUU0NBUEUyLjADAQAAACwAAAAAlgBkAAAC1YyPqcvtD6OctNqLs968+w+G4kiW5omm6sq27gvH8kzX9o3n+s73/g8MCofEovGITCqXzKbzCY1Kp9Sq9YrNarfcrvcLDovH5LL5jE6r1+y2+w2Py+f0uv2OvwD2fP6iD/gH6Pc2GIhg2JeQSNjGuLf4GMlYKIloefAIUEl52ZmJyaY5mUhqyFnqmQr6KRoaMKp66hbLumpQ69oK+5qrOyg4a6qYV2x8jJysvMzc7PwMHS09TV1tfY2drb3N3e39DR4uPk5ebn6Onq6+zt7u/g4fL99UAAAh+QQACgAAACwAAAAAlgBkAIEAAAB9fX329vYAAAAC3JSPqcvtD6OctNqLs968+w+G4kiW5omm6sq27gvH8kzX9o3n+s73/g8MCofEovGITCqXzKbzCY1Kp9Sq9YrNarfcrvcLDovH5LL5jE6r1+y2+w2Py+f0uv2OvwD2fP4iABgY+CcoCNeHuJdQyLjIaOiWiOj4CEhZ+SbZd/nI2RipqYhQOThKGpAZCuBZyArZprpqSupaCqtaazmLCRqai7rb2av5W5wqSShcm8fc7PwMHS09TV1tfY2drb3N3e39DR4uPk5ebn6Onq6+zt7u/g4fLz9PX29/j5/vVAAAIfkEAAoAAAAsAAAAAJYAZACBAAAAfX199vb2AAAAAuCUj6nL7Q+jnLTai7PevPsPhuJIluaJpurKtu4Lx/JM1/aN5/rO9/4PDAqHxKLxiEwql8ym8wmNSqfUqvWKzWq33K73Cw6Lx+Sy+YxOq9fstvsNj8vn9Lr9jr8E9nz+AgAYGLjQVwhXiJgguAiYgGjo9tinyCjoKLn3hpmJUGmJsBmguUnpCXCJOZraaXoKShoJe9DqehCqKlnqiZobuzrbyvuIO8xqKpxIPKlwrPCbBx0tPU1dbX2Nna29zd3t/Q0eLj5OXm5+jp6uvs7e7v4OHy8/T19vf4+fr7/P379UAAAh+QQACgAAACwAAAAAlgBkAIEAAAB9fX329vYAAAAC4JSPqcvtD6OctNqLs968+w+G4kiW5omm6sq27gvH8kzX9o3n+s73/g8MCofEovGITCqXzKbzCY1Kp9Sq9YrNarfcrvcLDovH5LL5jE6r1+y2+w2Py+f0uv2OvwT2fP6iD7gAMEhICAeImIAYiFDoOPi22KcouZfw6BhZGUBZeYlp6LbJiTD6CQqg6Vm6eQqqKtkZ24iaKtrKunpQa9tmmju7Wwu7KFtMi3oYDMzompkHHS09TV1tfY2drb3N3e39DR4uPk5ebn6Onq6+zt7u/g4fLz9PX29/j5+vv8/f31QAADs=';
            function createHolder(toReplace) {
                var placeholder = document.createElement('img');
                placeholder.src = loadingGif;
                placeholder.className = 'sceditor-ignore';
                placeholder.id = 'sce-dragdrop-' + (Math.random() + 1).toString(36).substring(7);

                function replace(html) {
                    var node = instance.getBody().ownerDocument.getElementById(placeholder.id);

                    if (node) {
                        if (typeof html === 'string') {
                            node.insertAdjacentHTML('afterend', html);
                        }
                        node.parentNode.removeChild(node);
                    }
                }

                return function () {
                    if (toReplace) {
                        toReplace.parentNode.replaceChild(placeholder, toReplace);
                    } else {
                        instance.wysiwygEditorInsertHtml(placeholder.outerHTML);
                    }

                    return {
                        insert: function (html) {
                            replace(html);
                        },
                        cancel: replace
                    };
                };
            }
            var bbcode_toggle_dark_mode = function() {
                // Find all bbcode text boxes
                $(".sceditor-container").each(function(index) {
                    var body = $(this).children('iframe').contents().find('body');
                    if ($(body).hasClass('dark-mode')) {
                        $(body).removeClass('dark-mode');
                    } else {
                        $(body).addClass('dark-mode');
                    }
                });
            };
            var upload_cmd = function() {
                // https://stackoverflow.com/questions/16215771/how-to-open-select-file-dialog-via-js
                // Open file dialog and trigger an ajax file upload
                //var editor = this;
                var csrftoken = $('input[name=csrfmiddlewaretoken]').first().val();
                $('#bbcode_upload_form').remove();
                $(document.body).append('<form id="bbcode_upload_form" action="'+g_upload_media_url+'" style="display:none"><input id="bbcode_upload_file" type="file"><input name="csrfmiddlewaretoken" value="' + csrftoken + '"></form>');
                //RB.bind_fileupload();
                $('#bbcode_upload_file').on('change', function() {
                    // User selected a file, now upload it using same method as drag/drop handler
                    // wtf? apparently can access file via the input's id as a variable
                    handleFile(bbcode_upload_file.files[0], createHolder());
                });
                $('#bbcode_upload_file').trigger('click'); // open file dialog
            };
            // https://www.sceditor.com/posts/drag-drop-upload-demo/
            function upload_media_file(file) {
                var form = new FormData();
                form.append('file', file);
                var csrftoken = $('input[name=csrfmiddlewaretoken]').first().val();
                form.append('csrfmiddlewaretoken', csrftoken);
                form.append('max_w', max_w);
                form.append('max_h', max_h);

                return fetch(g_upload_media_url, {
                    method: 'post',
                    body: form
                }).then(function (response) {
                    return response.json();
                }).then(function (result) {
                    console.log(result);
                    if (result.status == 'success') {
                        return result.url;
                    }
                    RB.show_error(result.msg);
                    throw result.msg;
                }).catch(function(error) {
                    RB.show_error(error);
                });
            }
            var handleFile = function (file, createPlaceholder) {
                console.log(file);

                var placeholder = createPlaceholder();

                var upload_and_embed_file = function(file) {
                    upload_media_file(file).then(function (url) {
                        if (url) {
                            if (file.type.match(/image.*/)) {
                                placeholder.insert('<img class="img-fluid" src=\'' + url + '\' />');
                            } else {
                                // if uploaded image does not have a file extension, JS won't know it's an image
                                placeholder.insert('<a href=\'' + url + '\' />' + file.name + '</a>');
                            }
                        } else {
                            placeholder.cancel();
                        }
                    }).catch(function () {
                        placeholder.cancel();
                    });
                };

                // Ensure it's an image
                console.log(file.type);
                if (file.type.match(/image.*/) && file.type != 'image/gif') {
                    // Shrink image before uploading.
                    // If it's a gif image, just upload without shrinking as it's probably an animation (who uses gif otherwise?)
                    var reader = new FileReader();
                    reader.onload = function (readerEvent) {
                        var image = new Image(); // this seems to handle exif rotation, yay
                        image.onload = function (imageEvent) {
                            // Resize the image
                            var canvas = document.createElement('canvas'),
                                width = image.width,
                                height = image.height;
                            var factor = Math.min(max_w/width, max_h/height);
                            if (factor < 1) {
                                // Shrink image before uploading to save bandwidth (server resizes anyway if it's too large).
                                // TODO: don't do this if it's an animated png... but nfi how to detect it
                                width = Math.round(width * factor);
                                height = Math.round(height * factor);
                                console.log('Shrinking image by ' + factor + ' to ' + width + 'x' + height);

                                canvas.width = width;
                                canvas.height = height;
                                canvas.getContext('2d').drawImage(image, 0, 0, width, height);
                                // Upload resized blob as a file, not sure on Safari support
                                canvas.toBlob((blob) => {
                                    let resizedImage = new File([blob], file.name, {type: file.type});
                                    upload_and_embed_file(resizedImage);
                                }, file.type);
                            } else {
                                // Upload with no pre-processing to avoid losing animations
                                console.log('Uploading without shrinking');
                                upload_and_embed_file(file);
                            }
                        };
                        image.src = readerEvent.target.result;
                    };
                    reader.readAsDataURL(file);

                } else {
                    // non-image file
                    if (file.size > 10*1024*1024) { // 10MB, needs to be same as in common.py UPLOADS_MAX_FILE_SIZE
                        RB.show_error('File is too big: ' + file.size);
                        return;
                    }
                    console.log('Uploading non-image file');
                    upload_and_embed_file(file);
                }
            };
            // customise bbcode tags. default logic is in bbcode.js
            sceditor.formats.bbcode.set("img", {
                tags: { img: {src: null} },
                html: function (token, attrs, content) {
                    // rely on css to size images full width
                    /*var	undef, width, height, match, attribs = '';
                    width  = attrs.width;
                    height = attrs.height;

                    if (attrs.defaultattr) {
                        match = attrs.defaultattr.split(/x/i);

                        width  = match[0];
                        height = (match.length === 2 ? match[1] : match[0]);
                    }
                    if (width !== undef) {
                        attribs += ' width="' + sceditor.escapeEntities(width, true) + '"';
                    }
                    if (height !== undef) {
                        attribs += ' height="' + sceditor.escapeEntities(height, true) + '"';
                    }*/

                    return '<img src="' + sceditor.escapeUriScheme(content) + '" class="img-fluid">';
                }
            });
            sceditor.formats.bbcode.set("table", {
                tags: {table: null},
                html: '<table class="table">{0}</table>'
            });
            sceditor.formats.bbcode.set("part", {
                tags: {part: null},
                format: '[part]{0}[/part]',
                html: '<a href="/parts/{0}/" target="_blank">{0}</a>'
            });
            sceditor.formats.bbcode.set("set", {
                tags: {set: null},
                format: '[set]{0}[/set]',
                html: '<a href="/sets/{0}/" target="_blank">{0}</a>'
            });
            /*sceditor.formats.bbcode.set("color", {
                tags: {font: {color: null}},
                styles: {color: null},
                quoteType: 2,
                format: function (elm, content) {
                    var	color;
                    if (!sceditor.dom.is(elm, 'font') || !(color = sceditor.dom.attr(elm, 'color'))) {
                        color = elm.style.color || sceditor.dom.css(elm, 'color');
                    }
                    return '[color=' + color + ']' + content + '[/color]';
                },
                html: function (token, attrs, content) {
                    return '<font color="' + sceditor.escapeEntities(attrs.defaultattr, true) + '">' + content + '</font>';
                }
            });*/
            //sceditor.instance(this).focus();

            // don't want all editors to grab focus eg admin tabs as they prevent keyboard scrolling of page
            var autofocus = $(this).hasClass('js-autofocus');
            // Can't put upload in list of default buttons, need to explicitly add it to data-buttons on bbcode forms.
            var buttons = 'bold,italic,underline,color,size|left,center,right,table|bulletlist,orderedlist|image,youtube,link,quote|source';
            if ($(this).data('buttons')) buttons = $(this).data('buttons');
            var toolbarContainer;
            // If special toolbar container element exists, use it. This helps keep the height of the textbox
            // correct after saving.
            // Only move toolbar to special element if there is only one (eg workbench page has multiple comments),
            // and only if this bbcode is that comment box (and not eg admin part notes).
            if (document.querySelectorAll('#comment_bbcode_toolbar').length == 1 && $(this).attr('name') == 'comment') {
                toolbarContainer = document.getElementById('comment_bbcode_toolbar');
            }
            var options = {
                format: 'bbcode',
                toolbar: buttons,
                style: '/static/css/bbcode-editor.css',
                emoticonsEnabled: false,
                plugins: 'dragdrop,autoyoutube,undo', // plaintext doesnt seem to work
                //dragdrop: {handleFile: handleFile},
                /*enablePasteFiltering: true,
                pastetext: {
                    addButton: true,
                    enabled: true // Set to true to start in enabled state
                },*/
                autoUpdate: true,
                autofocus: autofocus, autofocusEnd: false,
                // Place toolbar in a special element above the textarea so it looks better on small screens.
                // Used for comments,
                // If the element doesn't exist, defaults to old behaviour with toolbar inside bbcode container.
                toolbarContainer: toolbarContainer
            };
            // bbcode fields need to explicitly allow uploads
            if ($(this).data('uploads')) {
                // add drag/drop functionality
                options['dragdrop'] = {handleFile: handleFile};
                // add toolbar button to upload file
                sceditor.command.set('upload', {
                    exec: upload_cmd,
                    txtExec: upload_cmd,
                    tooltip: 'Upload and embed a file/image'
                });
            }
            // toggle dark mode button
            sceditor.command.set('toggledarkmode', {
                exec: bbcode_toggle_dark_mode,
                txtExec: bbcode_toggle_dark_mode,
                tooltip: 'Toggle Dark/Light Mode (test appearance in both modes)'
            });
            //console.log(options);
            // this has to come after the above customisations
            sceditor.create(this, options);
            var instance = sceditor.instance(this);
            // Hack template to add multiple css files (copied from our own header with .js-used-in-bbcode)
        	var body = instance.getBody();
        	var head = $(body).parent().find('head');
        	$('link.js-used-in-bbcode').each(function() {
                head.append('<link rel="stylesheet" type="text/css" href="' + this.href + '">');
            });
            // Set dark mode (won't change on toggle, needs a refresh)
            var is_dark = $('body').hasClass('dark-mode');
            if (is_dark) { $(body).addClass('dark-mode'); }

            $(this).removeClass('bbcode').addClass('bbcode-done'); // so it doesn't get processed multiple times
        });
    };

    // Re-initialise any plugin elements for newly shown/loaded modals
    selector_body.on('shown.bs.modal', '.modal', function (e) {
        RB.fixSelect2();
        _popover();
        RB.initAutoSuggest();
    });

    // Clicked a switch - do an ajax post of the single input to save immediately.
    selector_body.on('click', 'input.js-switch, label.js-switch', function(ev) {
        var input;
        // Checkbox switches fire twice unless listen on input element.
        // Radio buttons need to listen on label though.
        if ($(this).is('input')) {
            input = $(this);
        } else {
            input = $(this).find('input'); // may be more than one (eg Sort Parts By)
        }
        var value = 0;
        var data = [];
        $(input).each(function() {
            if (this.type == 'checkbox') {
                if ($(this).prop('checked')) value = 1; else value = 0;
            } else {
                value = $(this).val();
            }
            data.push({'name': $(this).attr('name'), 'value': value});
        });

        var url = '';
        if ($(this).data("url")) {
            url = $(this).data("url");
        } else {
            // Get URL from enclosing form
            url = $(this).parent('form').data('url');
        }
        if (url) {
            RB.post_ajax({
                elem: $(''),
                url: url,
                data: $.param(data),
                html: $($(this).data('html'))
            }, function() {
                // no longer used, is stupid anyway
                //if (input.data('onchange')) eval(input.data('onchange'));
            });
        }
    });

    function remove_tags_keep_newlines(html) {
        // https://stackoverflow.com/questions/33722415/how-to-remove-html-tags-using-javascript-and-keep-newline
        html = html.replace(/<br>/g, "$br$");
        html = html.replace(/(?:\r\n|\r|\n)/g, '$br$');
        html = html.replace(/<\/div>/g, "$br$ $br$");
        html = html.replace(/<\/p>/g, "$br$ $br$");
        html = html.replace(/<\/li>/g, "$br$");
        var tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        html = tmp.textContent || tmp.innerText;
        html = html.replace(/\$br\$/g, "\n");
        return html;
    }

    selector_body.on('click', '.js-copy-clipboard', function() {
        // Works on form inputs eg textarea or elements with a data-val=""
        var text;
        if ($(this).data('val')) {
            // element as content in data-val=""
            text = $(this).data('val');
        } else {
            // get content from data-elem="" referenced form input element
            text = $($(this).data('elem')).val();
        }
        RB.copy_to_clipboard(text);
        $($(this).data('msg')).html('Copied!');
    });

    selector_body.on('click', '.js-copy-clipboard-html-as-text', function() {
        // Copy HTML elements, removing tags to leave just text components.
        var input = $('<textarea>');
        input.val($($(this).data('elem')).html());
        //var text = $(input.val()).text();
        var text = remove_tags_keep_newlines(input.val());
        //console.log(text);
        RB.copy_to_clipboard(text);
        $($(this).data('msg')).html('Copied!');
    });

    // Immediately post an input value
    selector_body.on('blur', '.js-post-input', function(ev) {
        //console.log('blur');
        var data = [];
        var value = $(this).val();
        data.push({'name': $(this).attr('name'), 'value': value});

        var url = '';
        if ($(this).data("url")) {
            url = $(this).data("url");
        } else {
            // Get URL from enclosing form
            url = $(this).parent('form').data('url');
        }
        if (url) {
            RB.post_ajax({
                elem: $(''),
                url: url,
                data: $.param(data)
            });
        }
    });

    // Click trigger toggle display of another field
    selector_body.on('click', '.js-toggle-field', function(data) {
        var field = $(this).data('field');
        var icon = $(this).data('icon');
        $(field).toggle();
        if (icon) {
            if ($(field).is(':visible')) {
                $(icon).removeClass('fa-chevron-down').addClass('fa-chevron-up');
            } else {
                $(icon).removeClass('fa-chevron-up').addClass('fa-chevron-down');
            }
        }
        RB.initLazyLoad();
        if ($(this).has('A').length>0 || $(this).is('A')) {
            // avoid A tag's running, need others eg checkboxes to still run normally
            return false;
        }
    });

    // Clicked the open external link button on an Input field
    selector_body.on('click', '.js-input-link', function(data) {
        var url = $('#'+$(this).data('input')).val();
        url = url.split(' ')[0];  // if multiple sets, just use first one
        if ($(this).data('prefix')) {
            url = $(this).data('prefix') + url;
        }
        window.open(url, '_blank');
    });

    // Clicked a Toggle button - change it's state
    selector_body.on('click', '.btn-toggle', function() {
        console.log('toggle button');
        var show = $(this).hasClass('active');
        if (show) {
            $(this).removeClass('active');
            $(this).blur();
        } else {
            // first untoggle all buttons in the same group
            $(this).parent('.btn-group').find('.btn-toggle').removeClass('active');
            $(this).addClass('active');
        }
    });

    RB.initColorFilters = function() {
        selector_body.find('.js-filter-colors').each(function() {
            RB.filterColors($(this));
        });
    }
    RB.filterColors = function(btn) {
        var select = btn.parents('.input-group').children('select');
        var current_group = select.data('group');
        var linked_to_part = select.data('linkpart');
        var icon = btn.children('i');

        var orig_value = select.val();
        console.log('orig_value = ' + orig_value);

        console.log('Filtering colors to ' + current_group);
        console.log('Linked to part: ' + linked_to_part);
        //console.log('Filtered status: ' + select.data('filtered'));

        if (select.data('filtered') === '1') {
            // nothing to do (don't do again, or loses selected value)
            console.log('Already filtered');
            return
        }

        // Create backup select if it doesn't exist (may be multiple per page)
        if (select.attr('bkp')) {
            // restore backup
            var select_bkp = $('#'+select.attr('bkp'));
            console.log('restoring select from backup #' + select.attr('bkp') + ' value = ' + select_bkp.val());
            select.html(select_bkp.html()).show();
            console.log('post restore selected = ' + select.val());
        } else {
            // create backup with all options
            var select_bkp = select.clone();
            select_bkp.attr('id', RB.getRandomHash()).appendTo('body').hide(); // outside current form
            console.log(select_bkp);
            //select_bkp.val(select.val()); // copy selected value to backup
            select.attr('bkp', select_bkp.attr('id'));
            console.log('backed up select to #' + select_bkp.attr('id') + ' value = ' + select_bkp.val());
        }

        // Update optgroup label and toggle icon
        if (current_group == 'A') {
            select.find('optgroup').attr('label', 'All Colors');
            icon.removeClass('fa-toggle-on').addClass('fa-toggle-off');
        } else {
            if (linked_to_part == '1') {
                select.find('optgroup').attr('label', 'Used Colors');
            } else {
                select.find('optgroup').attr('label', 'Current Colors');
            }
            icon.removeClass('fa-toggle-off').addClass('fa-toggle-on');
        }

        // Safari just ignores the hide(). Need to remove/insert them instead.
        if (current_group != 'A') {
            select.find('option').each(function () {
                if ($(this).data('group') == 'A') {
                    $(this).remove();
                }
            });
        }

        // Sort options
        var v = select.val();
        //console.log('pre sort selected = ' + select.val());
        if (current_group == 'A') {
            // All - Sort alpha
            select.find('optgroup').html(select.find('optgroup option').sort(function (a, b) {
                return a.text == b.text ? 0 : a.text < b.text ? -1 : 1
            }));
        } else {
            if (select.find('optgroup option').first().data('used') !== '') {
                // Used - sort by data-used
                select.find('optgroup').html(select.find('optgroup option').sort(function (a, b) {
                    return parseInt(a.dataset.used) == parseInt(b.dataset.used) ? 0 : parseInt(a.dataset.used) < parseInt(b.dataset.used) ? 1 : -1
                }));
            } else {
                // Current - sort by alpha
                select.find('optgroup').html(select.find('optgroup option').sort(function (a, b) {
                    return a.text == b.text ? 0 : a.text < b.text ? -1 : 1
                }));
            }
        }
        //console.log('post sort selected = ' + select.val());
        // Sorting causes Firefox to lose track of the selected option
        select.val(v);

        select.data('filtered', '1');

        var new_value = select.val();
        console.log('new_value = ' + new_value);
        if (new_value != orig_value) {
            // The filtering prevents the selected value from being displayed (eg retired color but we want to show Current)
            // So, undo the filtering.
            console.log('Selected color lost, un-filtering');
            select.data('group', 'A');
            select.data('filtered', '0');
            RB.filterColors(btn);
        }

    }
    selector_body.on('click', '.js-filter-colors', function() {
        var select = $(this).parents('.input-group').children('select');
        var current_group = select.data('group');
        console.log('Toggle color filter from ' + current_group);
        if (current_group == 'A') {
            select.data('group', 'C');
        } else {
            select.data('group', 'A');
        }
        select.data('filtered', '0');
        RB.filterColors($(this));
    });

    selector_body.on('click', '.js-filter', function() {
        var s = $(this).data('show');
        var h = $(this).data('hide');
        $(h).hide();
        $(s).show();
        RB.initLazyLoad();
        $(this).siblings('.js-filter').removeClass('active');
        $(this).addClass('active');
        // NOTE: if filtering a datatable with fixedheader, need to re-init it each time, see part_details.html
    });



    RB.initDataTables = function(table, options) {
        // https://datatables.net/reference/option/
        var defaults = {
            "deferRender": true,
            "lengthChange": false,
            "order": [
                [0, 'desc']
            ],
            "pageLength": 10
        };
        if (options) {
            $.extend(defaults, options);
        }
        var oTable = $(table).dataTable(defaults);
    };


    /*
    Cookies
    */

    RB.initCookies = function() {
        // Don't use this unless you need cookie expiration logic eg Plan Upgrade message
        // Use js-dismiss-msg instead
        $('.js-visibility-cookie').each(function () {
            // If the cookie doesn't exist, show the element
            if (!Cookies.get($(this).data('name'))) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });

        // Handle cookie defaults. Annoyingly placed here due to bad import_base.html design.
        // TODO: refactor imports to use same modal as everything else
        var import_parts_fix_molds = RB.get_cookie('import_parts_fix_molds');
        if (typeof import_parts_fix_molds !== 'undefined') {
            $('#import_parts_fix_molds').prop('checked', (import_parts_fix_molds == '1'));
        }
    };

    RB.get_cookie = function(name) {
        c = Cookies.get(name)
        if (g_debug) console.log('Get Cookie: ' + name + ' = ' + c);
        return c;
    };

    RB.set_cookie = function(name, value, expires=99999) {
        // expires = days, careful as every unexpired cookie is sent with every request
        if (g_debug) console.log('Set Cookie: ' + name + ' = ' + value);
        Cookies.set(name, value, {expires: expires});
    };

    RB.delete_cookie = function(name) {
        if (g_debug) console.log('Delete Cookie: ' + name);
        Cookies.remove(name);
    };

    selector_body.on('click', '.js-set-cookie', function() {
        // data-name = cookie name
        // data-value = cookie value (optional, default to '1')
        // data-expires = expiration in days (optional, default to never expire)
        var expires = parseInt($(this).data('expires')); // days
        if (!expires) expires = 365; // a year
        var value = $(this).data('value');
        if (!value) value = '1';
        //Cookies.set($(this).data('name'), value, {expires: expires});
        RB.set_cookie($(this).data('name'), value, expires);
        RB.initCookies();
    });

    selector_body.on('click', '.js-checkbox-cookie', function() {
        // Place on checkboxes to have their values remembered in a cookie.
        // data-name = cookie name
        // data-expires = expiration in days (optional, default to never expire)
        var expires = parseInt($(this).data('expires')); // days
        if (!expires) expires = 99999; // basically forever
        var value;
        if ($(this).is(':checked')) value = '1'; else value = '0';
        Cookies.set($(this).data('name'), value, {expires: expires});
    });


    /*RB.hideDismissibleMessages = function() {
        // Stop using cookies to store message visibility, use browser storage with an eviction mechanism.
        // Messages are visible on page load, then hidden by calling this function. To avoid page layout changes,
        // would need to store in database instead and selectively render page.
        let messages = JSON.parse(localStorage.getItem('dismissible-messages'));
        if (messages) {
            for (let i = 0; i < messages.length; i++) {
                //console.log('hiding: ', messages[i]);
                $('.js-dismissible-msg[data-name=' + messages[i] + ']').hide();
            }
        }
    }*/

    selector_body.on('click', '.js-dismiss-msg', function() {
        // data-name = message id, any string but shorter is better
        var msg_id = $(this).data('name');

        // Stored in local storage as a list of messages. Each item has an id and date added.
        // When too many messages are in the list, the oldest is removed.
        /*let messages = JSON.parse(localStorage.getItem('dismissible-messages'));
        if (!messages) {
            messages = [];
        }
        messages.push(msg_id);

        if (messages.length > 100) {
            // Too many messages stored, remove the oldest. Arrays preserve order so just remove the first item.
            // Dismissible messages are not meant to be around for too long so the oldest should no longer be
            // rendering anyway.
            messages.shift();
        }

        localStorage.setItem("dismissible-messages", JSON.stringify(messages));
        */

        if (g_username) {
            // Only saves for logged in users
            RB.post_ajax({url: '/users/' + g_username + '/messages/dismiss/', data: 'msg_id=' + msg_id});
        }
    });


    /*
    First touch
    */

    if (g_is_authenticated) {
        RB.delete_cookie('ft_ref');
        RB.delete_cookie('ft_lp');
    } else {
        var ft_ref = RB.get_cookie('ft_ref');
        if (typeof ft_ref === 'undefined') {
            RB.set_cookie('ft_ref', document.referrer, 30);
            RB.set_cookie('ft_lp', document.location.pathname + document.location.search, 30);
        }
    }
    if (document.location.href.indexOf('rebrickable.com/s/') > -1) {
        // Attribute this session to a sponsor. Replaces existing cookie if it exists.
        RB.set_cookie('sponsor', document.location.href.substring(18+document.location.href.indexOf('rebrickable.com/s/')), 30);
    }


    /*
    Auto Suggest
    */

    RB.initAutoSuggestMultiple = function() {
        // Set up the Select2 control
        if ($('.select2-typeahead').length > 0) {
            loadScript(plugin_path + 'select2/js/select2.min.js', function () {
                // https://select2.org/data-sources/ajax
                $('.select2-typeahead').select2({
                    ajax: {
                        url: '/users/search/suggest_user/',
                        delay: 250,
                        dataType: 'json',
                        data: function (params) {
                            var query = {
                                username: params.term,
                            };
                            return query;
                        },
                        processResults: function (data) {
                            /*var x = $.map(data, function (obj) {
                                obj.text = obj.text || obj.name.split(' ').pop();
                                return obj;
                            });*/
                            return {
                                results: data
                            };
                        }
                    },
                    minimumInputLength: 2,
                    templateResult: format_result
                });

                function format_result(item) {
                    //console.log(item);
                    if (item.loading) {
                        return item.text;
                    }
                    return $('<div class="p-3">' + item.name + '</div>');
                }

            });
        }
    };

    RB.initAutoSuggest = function() {
        // Not using the Smarty autosuggest init as we need extra stuff.
        // Uses: https://github.com/twitter/typeahead.js

        // Exclude ones that are already initialised.
        _container = $('div.autosuggest:not(:has(.twitter-typeahead))');

        if (_container.length > 0) {

            // Needed on every page now
            // typeahead.bundle.min.js minified manually at https://javascript-minifier.com/
            //loadScript(plugin_path + 'typeahead.bundle.min.js', function() {

                if ($().typeahead) {

                    _container.each(function () {
                        var _t = $(this),
                            _minLength = _t.attr('data-minLength') || 1,
                            _qryURL = _t.attr('data-queryURL'),
                            _limit = _t.attr('data-limit') || 10,
                            _autoload = _t.attr('data-autoload');
                        var _inventory = _t.attr('data-inventory');
                        var _store_id = _t.attr('data-storeid');

                        if (_autoload == "false") {
                            return false;
                        }

                        /** **/
                        /* Bloodhound (Suggestion Engine) */
                        var _typeahead = new Bloodhound({
                            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
                            queryTokenizer: Bloodhound.tokenizers.whitespace,
                            limit: _limit,
                            remote: {
                                url: $(this), // so we can get dynamic url at search time
                                replace: function (url, query) {
                                    url = url.attr('data-queryURL') + query;
                                    return url;
                                }
                            },
                        });

                        $('.typeahead', _t).typeahead({
                                limit: _limit,
                                hint: _t.attr('data-hint') == "false" ? false : true,
                                highlight: _t.attr('data-highlight') == "false" ? false : true,
                                minLength: parseInt(_minLength),
                                cache: false,
                            },
                            {
                                /* Assumes data source returns a list of dicts {'id': id, 'name': name} */
                                name: '_typeahead',
                                source: _typeahead,
                                display: 'id',  // Value used in input field after selection
                                templates: {
                                    suggestion: function (item) {
                                        return '<div>' + item.name + '</div>';
                                    }
                                },
                            }).on('typeahead:select', function (ev, suggestion) {
                            if (suggestion.inventories) {
                                // Set suggestion, update list of inventories for the set
                                var select;
                                if (_inventory) {
                                    select = $(_inventory);
                                } else {
                                    select = $('select[name=inventory]');
                                }
                                if (select) {
                                    select.empty();
                                    $.each(suggestion.inventories, function (key, value) {
                                        select.append('<option value=' + value.id + '>' + value.name + '</option>');
                                    });
                                }
                            }
                            if (suggestion.store_id) {
                                // Store names are not unique, use it's ID instead
                                $(_store_id).val(suggestion.store_id);
                            }
                            if ($(this).parents('.search-box')) {
                                // Global search - clicked result
                                if (suggestion.url) location.href = suggestion.url;
                            }
                        });

                    });

                }
            //});

        }
    };
    //RB.initAutoSuggest();

    RB.initCustomFileUpload = function() {
        // When done gets wrapped with .input-group span, so exclude that to avoid doubling
        var files = $('*:not(.input-group) > input[type=file].custom-file-upload');
        //console.log(files);
        if (files.length > 0) {
            loadScript(plugin_path + 'custom.fle_upload.min.js', function () {
                try {
                    // get again after script has loaded (it can get loaded twice)
                    var files = $('*:not(.input-group) > input[type=file].custom-file-upload');
                    files.customFile(); // file upload input
                } catch (e) {
                    // This fails a LOT when a 2nd load thinks its ready while 1st load is in progress
                    console.log(e);
                }
            });
        }
    };

    // eg Submit User Photo
    // TODO: refactor other fileupload calls to use this?
    // https://github.com/blueimp/jQuery-File-Upload/wiki/Basic-plugin
    RB.bind_fileupload = function() {
        // JS is only included when user is logged in
        if ($.fn.fileupload) {
            //console.log($('.js-ajax-file-upload'));
            $('.js-ajax-file-upload').fileupload({
                //url: $(this).parents('form').attr('action'),
                //dropZone: $(this).data('dropzone'), // TODO: not working unless in a modal... wtf?
                //dropZone: $('#drop_file_msg'),
                //autoUpload: false,  // overriding add turns this off
                singleFileUploads: false,  // post multiple files at once
                dataType: 'json',
                add: function (e, data) {
                    // Selected file, or dropped into dropzone
                    if ($(e.target).data('donotupload') == '1') {
                        // do nothing
                        console.log('do not upload');
                        return
                    }
                    RB.initControls();  // for custom file upload
                    var submit_btn = $(e.target).data('submitbtn'); // the manual button that should fire the form post (dont use one that also triggers ajax-form), exclude to auto-submit
                    if (submit_btn) {
                        $(submit_btn).off('click').on('click', function () {
                            console.log(data);
                            data.submit(); // use plugin's ajax post method which works and mine doesn't :(
                        });
                    } else {
                        // Use default auto upload from https://github.com/blueimp/jQuery-File-Upload/wiki/Options
                        if (data.autoUpload || (data.autoUpload !== false && $(this).fileupload('option', 'autoUpload'))) {
                            data.process().done(function () {
                                console.log(data);
                                data.submit();
                            });
                        }
                    }
                },
                done: function (e, data) {
                    if (data.result.status == 'success') {
                        // Have to check this before render_elements which can replace the form and e.target is lost
                        if ($(e.target).parents('form').data('donthidemodalonsuccess') != '1') {
                            $('.modal').modal('hide');
                        }
                        RB.render_elements(data.result.renders);
                        RB.initControls();
                        if (data.result.msg) {
                            RB.show_success(data.result.msg);
                        }
                        // a lot of duplicate because we aren't using ajax-form code :( i hate javascript
                        if (data.result.poll_interval) {
                            context = {};
                            context.url = data.result.poll_url;
                            if (data.result.poll_elem || data.result.poll_elem == '') { context.elem = $(data.result.poll_elem); } // replace elem for spinner if needed
                            g_polling_timer = setTimeout(function () {RB.post_ajax(context)}, data.result.poll_interval);
                        }
                    } else {
                        RB.show_error(data.result.msg);
                        RB.render_elements(data.result.renders); // eg form errors
                        RB.initControls();  // for custom file upload
                    }
                    $($(this).data('spinner')).hide();
                },
                fail: function (e, data) {
                    console.log(data);
                    $($(this).data('spinner')).hide();
                    RB.show_error("ERROR " + data.jqXHR.status + ": " + data.errorThrown);
                    RB.initControls();
                },
                drop: function (e, data) {
                    // Dropped file into dropzone
                    var msg = 'Added File:<br> ' + data.files[0].name;
                    if (data.files.length > 1) {
                        msg = 'Added Files:<br> ';
                        for (i = 0; i < data.files.length; i++) {
                            msg += data.files[i].name + ', ';
                        }
                    }
                    $('#drop_file_msg').html(msg);
                },
                start: function (e) {
                    $($(this).data('spinner')).removeClass('hide').show().html(RB.spinner);
                },
            }).prop('disabled', !$.support.fileInput)
                .parent().addClass($.support.fileInput ? undefined : 'disabled');
        }
        // https://github.com/blueimp/jQuery-File-Upload/wiki/Drop-zone-effects
        $(document).bind('dragover', function (e) {
            var dropZone = $('#dropzone'),
                timeout = window.dropZoneTimeout;
            if (timeout) {
                clearTimeout(timeout);
            } else {
                dropZone.addClass('in');
            }
            var hoveredDropZone = $(e.target).closest(dropZone);
            dropZone.toggleClass('hover', hoveredDropZone.length);
            window.dropZoneTimeout = setTimeout(function () {
                window.dropZoneTimeout = null;
                dropZone.removeClass('in hover');
            }, 100);
        });
    };

    RB.initDatePicker = function() {
        // Use Bootstrap datepicker (via Smarty) instead of jquery-ui datepicker
        //_pickers(); // .datepicker

        // Different one for .datetimepicker https://xdsoft.net/jqplugins/datetimepicker/
        if ($('.datetimepicker').length > 0) {
            $('.datetimepicker').each(function () {
                var input = $(this);
                var showtime = false;
                if (input.data('showtime')) showtime = true;
                input.datetimepicker({
                    format: input.data('format'),
                    timepicker: showtime,
                    scrollInput : false
                });
            });
        }
    };

    let g_moc_imps = {};
    let g_moc_imps_timer = null;
    let post_moc_imps = function() {
        if (g_debug) console.log('post_moc_imps checking');
        if (Object.keys(g_moc_imps).length > 0) {
            g_moc_imps_timer = null;

            // If on feed page, need to keep track of which MOCs were already sent so we don't double
            // the impressions by going back.
            if (g_prevent_moc_imp_dups_prefix) {
                console.log('feed - updating moc impressions');
                try {
                    all_imps = JSON.parse(sessionStorage.getItem(g_prevent_moc_imp_dups_prefix + "-mocimps"));
                } catch (e) {
                    console.error(e);
                }
                console.log('all_imps:', all_imps);
                if (all_imps) {
                    // already processed some, remove them from what we were about to send
                    console.log('already sent: ', all_imps);
                    console.log('need to send: ', g_moc_imps);
                    for (var spot in g_moc_imps) {
                        if (spot in all_imps) {
                            // https://stackoverflow.com/questions/19957348/remove-all-elements-contained-in-another-array
                            g_moc_imps[spot] = g_moc_imps[spot].filter(x => !all_imps[spot].includes(x))
                        }
                    }
                    console.log('left to send: ', g_moc_imps);

                    mocs_data = 'mocs=' + JSON.stringify(g_moc_imps);
                    RB.post_ajax({url: '/users/stats/mocs/impressions/', data: mocs_data});

                    // update storage with new total list sent
                    for (var spot in g_moc_imps) {
                        if (spot in all_imps) {
                            all_imps[spot] = all_imps[spot].concat(g_moc_imps[spot]);
                        } else {
                            all_imps[spot] = g_moc_imps[spot];
                        }
                    }
                } else {
                    // fresh list
                    all_imps = g_moc_imps
                    mocs_data = 'mocs=' + JSON.stringify(g_moc_imps);
                    if (g_debug) console.log('sending: ', g_moc_imps);
                    RB.post_ajax({url: '/users/stats/mocs/impressions/', data: mocs_data});
                }
                sessionStorage.setItem(g_prevent_moc_imp_dups_prefix + "-mocimps", JSON.stringify(all_imps));
            } else {
                // non-feed page
                mocs_data = 'mocs=' + JSON.stringify(g_moc_imps);
                if (g_debug) console.log('sending: ', g_moc_imps);
                RB.post_ajax({url: '/users/stats/mocs/impressions/', data: mocs_data});
            }

            g_moc_imps = {};

            // ab param just temp for a day or so to measure % of adblockers. Use in combination with base_root.html code
            /*var ab = RB.get_cookie('ab');
            if (typeof ab === 'undefined') ab='0';
            RB.post_ajax({url: '/users/stats/mocs/impressions/?ab='+ab, data: data})*/
            // end ab testing
        }
    }

    RB.initLazyLoad = function() {
        // lazy load any new images/videos
        $(window).lazyLoadXT({
            edgeY: 500,
        });

        // Lazy post MOC impression stats. This needs to be called whenever new MOCs are loaded via ajax.
        if (!g_is_crawler) {
            observer_mocs = new IntersectionObserver(entries => {
                entries.forEach((entry) => {
                    // Used to track MOC impressions as they come into view
                    if (entry.isIntersecting && entry.target.classList.contains('js-lazy-imps')) {
                        entry.target.classList.remove("js-lazy-imps");
                        let spot = entry.target.dataset.spot;
                        //console.log('spot = ' + spot);
                        g_moc_imps[spot] = g_moc_imps[spot] || [];
                        g_moc_imps[spot].push(parseInt(entry.target.dataset.set_id));
                        if (g_moc_imps_timer === null) {
                            // No timer scheduled yet, start one to run soon. Any extra impressions made before then
                            // will be included in the same call.
                            if (g_debug) console.log('scheduling post_moc_imps call');
                            g_moc_imps_timer = setTimeout(post_moc_imps, 3000);
                        }
                    }
                });
            }, {
                rootMargin: '100px',
                threshold: 0
            });
            document.querySelectorAll('.js-lazy-imps').forEach((target) => {
                observer_mocs.observe(target);
            });
        }
    };

    RB.initLazyLoadOnce = function() {
        // My custom lazy load for generic html sections. Only needs to run once per page but no harm if it ran again.

        // https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
        observer = new IntersectionObserver(entries => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && entry.target.classList.contains('js-lazy-load')) {
                    // remove class to prevent duplicate loads... although it is still possible
                    entry.target.classList.remove("js-lazy-load");
                    console.log('Lazy loading ' + entry.target.dataset.src);
                    RB.get_ajax({url: entry.target.dataset.src, elem: $(entry.target)});
                }
            });
        }, {
            rootMargin: '100px',
            threshold: 0
        });
        document.querySelectorAll('.js-lazy-load').forEach((target) => {
            observer.observe(target);
        });
    };

    RB.setCanonicalURL = function(new_url) {
        var url = '';
        if (!new_url) {
            // Don't do this here, some pages need them eg searches
            /*RB.removeURLParam('source');
            RB.removeURLParam('spot');
            RB.removeURLParam('t');
            RB.removeURLParam('cs');
            RB.removeURLParam('q');*/
            url = $("link[rel='canonical']").attr('href');
            // Remove UTM + email click params
            // TODO: killing anything after utm params so need to ensure important ones first
            //       eg ?spot=ad_fb&utm_source=fb&utm_campaign={{campaign.id}}
            url = url
                .replace(/(\&|\?)utm([_a-z0-9=]+)/g, "")
                .replace(/(\&|\?)elid([0-9=]+)/g, "");
            if (g_debug) console.log('Requesting canonical url ' + url);
            if (g_debug) console.log('Search = ' + location.search);
            var params = location.search;
            var hash = location.hash;
            // origin = https://rebrickable.com
            // pathname = /build/
            // search = ?a=b
            if (location.origin + location.pathname + location.search == url) {
                // params already in url
                new_url = url + hash;
            } else {
                // params missing from url
                new_url = url + params + hash;
            }
        }
        if (new_url) {
            if (g_debug) console.log('Setting canonical url ' + new_url);
            history.replaceState({}, null, new_url);
        }
    };
    RB.setCanonicalURL();

    RB.initControls = function() {
        // Re-initialise any form controls that might be newly loaded
        //RB.setCanonicalURL(); why was I doing this here? dont want URL to lose queryparams on every modal load
        //RB.hideDismissibleMessages();  // do early to minimise screen layout changes
        RB.initAutoSuggest();
        RB.initCustomFileUpload();
        RB.setBBCode();
        RB.fixiPadForms();
        RB.bind_fileupload();
        RB.fixSelect2();
        RB.initAutoSuggestMultiple();
        try {
            _lightbox();
            RB.initDatePicker();
            _toggle();
        } catch(err) {
            console.log('scripts.js probably not loaded');
        }
        RB.initLazyLoad();
        RB.initCookies();
        RB.initColorFilters();
    };
    RB.initControls();
    RB.initLazyLoadOnce();

    RB.initFlexSlider = function() {
        _flexslider(before_fn=function() {
            // Lazy load all slides at once. Could do just the next slide if lookup current slide number, but meh.
            $('.flex-viewport').lazyLoadXT();
        });
    }


    /*
    AJAX helper functions
    ---------------------
    */

    function escapeHtml(text) {
        return text.toString()
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
     }

    RB.show_error = function(msg) {
        if (g_debug) console.warn(msg);
        // Strip HTML from error message (eg links)
        var div = document.createElement("div");
        div.innerHTML = msg;
        var text = div.textContent || div.innerText || "";
        _toastr(escapeHtml(text),"top-right","error",false,{'timeOut': 60000});
    };

    RB.show_success = function(msg) {
        if (g_debug) console.log(msg);
        _toastr(escapeHtml(msg),"top-right","success",false,{});
    };

    RB.show_not_authenticated = function() {
        $('#not_authenticated_modal').modal();
    };

    RB.show_need_pro_plan = function() {
        $('#need_pro_plan_modal').modal();
    };

    RB.render_elements = function(renders) {
        // Re-render any updated elements
        if (renders) {
            $.each(renders, function(element, html){
                if (g_debug) { console.log($(element)); }
                $(element).html(html);
            });
            RB.setPartPricesView();
            RB.initLazyLoad();
            var force_highlight = selector_body.data('force_highlight');
            RB.setInventoryView(force_highlight=force_highlight);
            RB.setPartTilesView();
            RB.setSetTilesView();
        }
    };

    RB.post_ajax = function(context, done_fn) {
        /* Standard Ajax POST.
            context = {
                url =  POST to here
                elem = DOM element to show status messages on
                spinner (optional) = override spinner to use
                data (optional) = extra params
                html (optional) = element to replace with response.html if found
                method (optional) = to override default POST behaviour
                async (optional) = can turn off async
            }
            done_fn = Callback on done

            Returns the AJAX xhr object
        */
        context = context || {};
        var csrftoken = $('input[name=csrfmiddlewaretoken]').first().val();
        //var orig_html = context.elem.html();
        if (!context.spinner) {
            context.spinner = RB.spinner;
        }
        //context.elem.html(context.spinner);
        if (context.elem) {
            context.elem.spin();
        }
        var params = "csrfmiddlewaretoken="+csrftoken;

        if (context.data) {
            if (json = tryParseJSON(context.data)) {
                //console.log('JSON data');
                //console.log(json);
                json['csrfmiddlewaretoken'] = csrftoken;
                params = json;
                //params = JSON.stringify(json);
            } else {
                //console.log('Not JSON data');
                if (params) params += "&";
                params += context.data;
            }
            if (g_debug) { console.log(params); }
        }
        if (g_debug) { console.log(context); }

        var method = 'POST';
        if (context.method) { method = context.method; }
        if (context.async!==false) { context.async = true; }

        var done_fn_res = null;
        //var xhr = $.post(context.url, params).done(function(data, textStatus, jqXHR) {
        var xhr = $.ajax({url: context.url,
                          data: params,
                          type: method,
                          cache: false,
                          //processData: processData,
                          //contentType: contentType,
                          async: context.async}).done(function(data, textStatus, jqXHR) {
            if (jqXHR.responseJSON) {
                if (g_debug) { console.log(data); }
                if (data.not_authenticated) {
                    // User not authenticated error was returned
                    RB.show_not_authenticated();
                    //context.elem.html(orig_html);
                    context.elem.unspin();
                } else if (data.need_pro_plan) {
                    RB.show_need_pro_plan();
                    context.elem.unspin();
                } else {
                    // Authenticated user, or anon user was allowed
                    if (data.html) {
                        // Response included HTML (TODO: move all to using data.renders?)
                        if (context.html) {
                            // Replace indicated element
                            context.html.html(data.html);
                            //context.elem.html(orig_html);
                            if (context.elem && context.elem[0] !== context.html[0]) { context.elem.unspin(); }
                        } else {
                            // Otherwise replace spinner element
                            if (context.elem) {
                                context.elem.unspin();
                                context.elem.html(data.html);
                            }
                        }
                        // Run misc functions on success
                        //RB.setBBCode();
                        //RB.initAutoSuggest();
                        //RB.fixiPadForms();
                    } else {
                        //context.elem.html(orig_html);
                        if (context.elem) { context.elem.unspin(); }
                    }
                    if (data.status == 'success') {
                        if (data.msg != '') RB.show_success(data.msg);
                        if (data.hidemodal == '1') {
                            // i really need to refactor this mess
                            if (g_debug) { console.log('hiding modal'); }
                            $('.modal').modal('hide');
                        }
                    } else if (data.status == 'error') {
                        RB.show_error(data.msg);
                    } else {
                        RB.show_error('ERROR: Invalid response format :(');
                        console.log(data);
                    }
                    RB.render_elements(data.renders);
                    RB.initControls();
                    // Do we need to keep polling
                    if (data.poll_interval) {
                        context.url = data.poll_url;
                        if (data.poll_elem || data.poll_elem=='') { context.elem = $(data.poll_elem); } // replace elem for spinner if needed
                        g_polling_timer = setTimeout(function() {RB.post_ajax(context, done_fn)}, data.poll_interval);
                    } else {
                        // Callback for any extra processing
                        if (done_fn) {
                            done_fn_res = done_fn(data);
                        }
                        // Optionally reload
                        if (data.redirect_url) {
                            console.log('redirecting to ' + data.redirect_url);
                            //console.log('current page: ' + location.pathname + location.search + location.hash);
                            if (data.redirect_url == location.pathname + location.search + location.hash) {
                                location.reload(); // setting location to itself doesn't trigger a reload
                            } else {
                                location.href = data.redirect_url;
                            }
                        }
                        // Update URL with canonical one
                        if (data.canonical_url) {
                            RB.setCanonicalURL(data.canonical_url);
                        }
                    }

                    if (data.reloadonsuccess == '1' && data.status == 'success') location.reload();

                }
            } else {
                // Not a JSON response
                //context.elem.html(orig_html);
                if (context.elem) {context.elem.unspin(); }
                RB.show_error('ERROR: Invalid response format :(');
                console.log(data);
            }
        }).fail(function(xhr) {
            console.log(xhr);
            if (xhr.responseJSON && xhr.responseJSON.need_pro_plan) {
                $('.modal').modal('hide');
                RB.show_need_pro_plan();
            } else if (xhr.status == 401) {
                $('.modal').modal('hide');
                RB.show_not_authenticated();
            } else if (xhr.status == 403) {
                if (xhr.responseJSON) {
                    // RB custom 403
                    RB.show_error("ERROR " + xhr.status + ": " + xhr.responseJSON.msg);
                } else {
                    // Django 403
                    RB.show_error("ERROR " + xhr.status + ": Permission Denied");
                }
            } else if (xhr.status == 429) {
                RB.show_error("ERROR 429: Please slow down");
            } else if (xhr.status == 0 && xhr.statusText == 'abort') {
                // Aborted (probably on purpose)
            } else {
                RB.show_error("ERROR " + xhr.status + ": " + xhr.statusText);
                console.log(xhr.statusText);
            }
            //context.elem.html(orig_html);
            if (context.elem) { context.elem.unspin(); }
        });

        xhr.done_fn_res = done_fn_res; // so we can get result of done_fn (need async=false)
        return xhr;
    };

    // TODO: this is getting a bit redundant?
    RB.post_ajax_form = function(context, form_done_fn) {
        // Context params:
        //  url (optional) - override the form's action url to post to
        //  elem (optional) - element to display spinner (default form submit button)
        //  data (optional) - extra data to post with the form, serialized eg 'a=1&b=2'
        //  html (optional) - element to load with response.html if it exists
        //  form - duh
        //console.log('post_ajax_form');
        context = context || {};
        if (context.elem) elem = context.elem;
        else elem = context.form.find('button[type=submit]').first();
        if (context.url) url = context.url;
        else url = context.form.attr('action');
        data = context.form.serialize();
        if (context.data) data = data + '&' + context.data;

        var xhr = RB.post_ajax({
            elem: elem,
            url: url,
            data: data,
            html: context.html,
            method: context.form.attr('method')   // some forms need to use GET instead
        }, done_fn=function(data) {
            //console.log(data);
            //console.log('post_ajax_form done');
            if (context.form.data('donthidemodalonsuccess') != '1' && data.status == 'success') {
                if (g_debug) { console.log('hiding modal'); }
                $('.modal').modal('hide');
            }
            if (data.form_html) {
                $(context.form).replaceWith(data.form_html);
                RB.render_elements(data.renders); // do again in case form elements were rendered
                //console.log('form replaced');
                RB.initControls();
                //RB.show_related_sets_div(); not sure what needed this, but moved to submit.js now so find a better way
            }
            var reload = context.form.data('reloadonsuccess');
            if (form_done_fn) form_done_fn(data);
            if (context.form.data('js')) {eval(context.form.data('js'))};
            if (reload == '1' && data.status == 'success') location.reload();
            // TODO: test this still works since it's in RB.post_ajax now
            /*if (data.redirect_url) {
                location.href = data.redirect_url;
            }*/
        });
        return xhr;
    };

    // POST Ajax based forms.
    selector_body.on('submit', '.ajax-form', function() {
        var context = {form: $(this)};
        // data-html on the form if returning html for something other than the form
        if ($(this).data('html')) {
            context.html = $($(this).data('html'));
        }
        // data-elem if it exists, else defaults to form's submit button
        if ($(this).data('elem')) {
            context.elem = $($(this).data('elem'));
        }
        if (g_debug) { console.log('on .ajax-form'); }
        if ($(this).prop('ajax_form_xhr')) {
            // Cancel existing ajax request for this form if any exists
            $(this).prop('ajax_form_xhr').abort();
        }
        var form = $(this);
        $(this).prop('ajax_form_xhr', RB.post_ajax_form(context, function(data) {
            // update browser history with form parameters (if no canonical url has been set)
            if (form.data('sethistory') && !data.canonical_url) {
                var params = $('input[name!=csrfmiddlewaretoken], select', form).serialize();
                //var new_url = document.location.pathname + '?' + params;
                var new_url = form.attr('action') + '?' + params;
                console.log(new_url);
                history.pushState(params, null, new_url);
            } else if (form.data('sethistoryparams') && !data.canonical_url) {
                // Update only the params (useful for search forms)
                var params = $('input[name!=csrfmiddlewaretoken], select', form).serialize();
                var new_url = document.location.pathname + '?' + params;
                console.log(new_url);
                history.pushState(params, null, new_url);
            }
        }));
        return false;
    });

    selector_body.on('change', '.js-submit-on-change', function() {
        // Submit form on input change
        var form = $(this).parents('form').first();
        form.submit();
    });

    // Button that has data to post to a url. Don't use if you need to do anything non-standard with
    // the return data.
    selector_body.on('click', '.js-post-button', function() {
        // get url and data and post
        // Button/Link should have data fields for:
        //  url
        //  data (optional) = i know, not the best of names
        //  html (optional) = element to replace with response.html if exists
        // standard response fields:
        //  html (to replace data-elem from button)
        //  reloadonsuccess (reload page on success)
        var btn = $(this);
        var context = {elem: btn, url: btn.data('url'), data: btn.data('data')};
        if ($(btn.data('html')).length) {
            context.html = $(btn.data('html'));
        }
        RB.post_ajax(context, function(data) {
            if (data.reloadonsuccess) {
                location.reload();
            }
        });
        return false; // so links don't trigger
    });

    // Button that GETs a url. Don't use if you need to do anything non-standard with
    // the return data.
    selector_body.on('click', '.js-get-button', function() {
        // Button/Link should have data fields for:
        //  url
        //  html (optional) = element to replace with response.html if exists
        //  ajax (optional) = defaults to ajax call
        //  js (optional) = eval js on call done
        // standard response fields:
        //  html (to replace data-elem from button)
        var context = {elem: $(this), url: $(this).data('url')};
        if ($($(this).data('html')).length) {
            context.html = $($(this).data('html'));
        }
        var js = $(this).data('js');
        if ($(this).data('ajax') == '0') {
            // basically a link where we cant use an A tag (eg nested inside another A tag)
            location.href = $(this).data('url');
        } else {
            // defaults to ajax
            RB.get_ajax(context, function (data) {
                if (js) {
                    eval(js);
                }
            });
        }
        return false; // so links don't trigger
    });

    // GET a URL via Ajax and update the Browser's address bar + history.
    selector_body.on('click', '.js-ajax-link', function() {
        // Button/Link should have data fields for:
        //  url
        //  elem = element to replace with spinner
        //  html (optional) = element to replace with response.html if exists
        //  js (optional) = eval js on call done
        // standard response fields:
        //  html (to replace data-elem from button)
        var new_url = $(this).data('url');
        var elem = this;
        if ($(this).data('elem')) elem = $(this).data('elem');
        var context = {elem: $(elem), url: new_url};
        if ($($(this).data('html')).length) {
            context.html = $($(this).data('html'));
        }
        var js = $(this).data('js');
        RB.get_ajax(context, function (data) {
            history.pushState({}, null, new_url);
            if (js) {
                eval(js);
            }
        });
        return false; // so links don't trigger
    });
    // So back button works after a pushState? https://stackoverflow.com/questions/23429794/page-does-not-get-reloaded-when-going-back-in-history-in-combination-with-window
    // explanation: https://css-tricks.com/using-the-html5-history-api/
    $(window).on("popstate", function(e) {
        if (e.originalEvent.state !== null) {
            console.log(e.originalEvent.state);
            if (typeof ldrOptions == 'undefined') { // not when using BI Viewer
                location.reload();
            }
        }
    });

    // Used on buttons to submit forms to a specific url - e.g. if there are multiple types
    // of submit buttons that do different things.
    selector_body.on('click', '.js-post-form', function() {
        // Button must have:
        //  form = form to post
        //  url = url to post form data to
        //  html (optional) = element to load with response.html if exists
        // Standard response fields:
        //  html (to replace data-elem from button)
        //  reloadonsuccess (reload page on success)
        RB.post_ajax_form({elem: $(this), form: $($(this).data('form')),
            url: $(this).data('url'), html: $($(this).data('html'))});
        return false; // so links don't trigger
    });

    RB.get_ajax = function(context, done_fn) {
        // TODO: combine with post_ajax
        // Standard Ajax GET.
        //  elem = DOM element to show status messages on
        //  url = URL to GET
        //  done_fn = Callback on done
        //  data = (optional) extra params
        //  html = (optional) load response.html into this element
        // Returns the Promise so can chain done/fail functions, or use the done_fn parameter.
        context = context || {};
        //var orig_html = context.elem.html();
        if (context.elem) {context.elem.spin();}
        var params = "";
        if (context.data) {
            params += "&" + context.data;
        }
        var dataType = 'json';
        /*if (context.dataType) {
            dataType = context.dataType;
        }*/
        // Don't cache AJAX requests or back button shows ajax response in browser (eg Find Sets)
        return $.ajax({url: context.url, data:params, type: 'GET', cache: false}).done(function(data) {
        //return $.get(context.url, params).done(function(data) {
        /*$.ajax({
              url: context.url,
              data: params,
              dataType: dataType
            }).done(function(data) {*/
            if (data.not_authenticated) {
                // User not authenticated error was returned
                RB.show_not_authenticated();
                if (context.elem) {context.elem.unspin();}
            } else if (data.need_pro_plan) {
                RB.show_need_pro_plan();
                if (context.elem) {context.elem.unspin();}
            } else {
                // Authenticated user, or anon user was allowed
                if (data.html) {
                    if (context.elem) {context.elem.unspin();}
                    if (context.html) {
                        context.html.html(data.html);
                    } else {
                        context.elem.html(data.html);
                    }
                } else {
                    if (context.elem) {context.elem.unspin();}
                }
                if (data.status == 'success') {
                } else if (data.status == 'error') {
                    RB.show_error(data.msg);
                } else {
                    RB.show_error('ERROR: Invalid response format :(');
                    console.log(data);
                }

                RB.render_elements(data.renders);
                RB.initControls();

                // Callback for any extra processing
                if (done_fn) {
                    done_fn(data);
                }
                // Optionally reload
                if (data.redirect_url) {
                    location.href = data.redirect_url;
                }
                // Update URL with canonical one
                if (data.canonical_url) {
                    RB.setCanonicalURL(data.canonical_url);
                }
            }
        }).fail(function(xhr) {
            if (xhr.responseJSON && xhr.responseJSON.need_pro_plan) {
                $('.modal').modal('hide');
                RB.show_need_pro_plan();
                if (context.elem) {context.elem.unspin();}
            } else if (xhr.status == 401) {
                $('.modal').modal('hide');
                RB.show_not_authenticated();
            } else if (xhr.status == 403) {
                if (xhr.responseJSON) {
                    // RB custom 403
                    RB.show_error("ERROR " + xhr.status + ": " + xhr.responseJSON.msg);
                } else {
                    // Django 403
                    RB.show_error("ERROR " + xhr.status + ": Permission Denied");
                }
            } else if (xhr.status == 429) {
                RB.show_error("ERROR 429: Please slow down");
            } else {
                RB.show_error("ERROR " + xhr.status + ": " + xhr.statusText);
                console.log(xhr.statusText);
            }
            if (context.elem) {context.elem.unspin();}
        });
    };

    RB.load_modal = function(context, done_fn) {
        // Load the contents of a GET URL into a Modal
        //  modal
        //  modaltitle (optional)
        //  elem
        //  url
        //  data
        // TODO: refactor more calls to use this
        context = context || {};
        if (!($(context.modal).data('bs.modal') || {}).isShown) {
            if (context.modaltitle) {
                $(context.modal).find('.modal-title').html(context.modaltitle);
            }
            $(context.modal).modal();
        }
        RB.get_ajax({elem: context.elem, url: context.url, data: context.data}, function(data) {
            //console.log(context.elem.find('form input:not([readonly])').first());
            context.elem.find('form input:not([readonly])').first().focus();  // Set focus to input if there is one
            if (done_fn) done_fn(data);
            $(window).lazyLoadXT({scrollContainer: '#page_modal'});
        });
    };

    // Section that should be loaded on page load.
    RB.load_ajax_sections = function() {
        $('.js-load-ajax').each(function () {
            // Element should have data fields for:
            //  url
            //  html = element to replace with response.html if exists
            var context = {elem: $($(this).data('html')), html: $($(this).data('html')), url: $(this).data('url')};
            RB.get_ajax(context);
        });
    };
    RB.load_ajax_sections();


    /*
    Change Country
    --------------
    */

    selector_body.on('click', '.list-flags li', function() {
        RB.post_ajax({elem: $(this), url: '/geo/country/set/', data: 'code='+$(this).data('code')}, function(data) {
            if (data.status == 'success') {
                location.reload();
            }
        });
        return false;
    });


    /*
    Set/MOC Catalog
    ---------------
    */

    // Buttons with .js-load-modal need two data attributes:
    //  url = url to GET
    //  modal = selector of the modal to load
    //  elem = the element to load the data into (and show spinner)
    // TODO: this is a common pattern - refactor!
    selector_body.on('click', '.js-load-modal', function() {
        RB.load_modal({
            modal: $(this).data('modal'),
            modaltitle: $(this).data('modaltitle'),
            elem: $($(this).data('elem')),
            url: $(this).data('url')
        });
        return false;
    });
    // Commonly used modal, don't need to keep repeating data attributes
    selector_body.on('click', '.js-load-page-modal', function() {
        RB.load_modal({
            modal: '#page_modal',
            modaltitle: $(this).data('modaltitle'),
            elem: $('#page_modal_body'),
            url: $(this).data('url')
        });
        return false;
    });

	RB.load_inventory = function(url) {
        return RB.get_ajax({url: url, elem: $('#inventory')}).done(function(data) {
            RB.setInventoryView();
            RB.default_sort_items('#normal_parts');
            RB.default_sort_sets('#invsets');
            RB.setPartTilesView();
        });
    };

    RB.load_comments = function(url) {
        var highlighted_comment = '';
        if (document.location.hash.startsWith('#c') && document.location.hash != '#comments' && document.location.hash != '#changes') {
            // Capture it now as the hash will be lost on tab display
            highlighted_comment = document.location.hash;
        }

        return RB.get_ajax({url: url, elem: $('#set_comments')}).done(function(data) {
            RB.setBBCode();
            // If there is a comment context hash, jump to it again now that comments have loaded
            // Might not be in a tab (eg polls), so repeat tab change logic here
            if (document.location.hash.startsWith('#c') && document.location.hash != '#comments' && document.location.hash != '#changes') {
                g_highlighted_comment = document.location.hash;
            }
            RB.highlight_comment();
            RB.collapseCommentImages();
        });
    };

    selector_body.on('click', '.js-collapse-comments', function() {
        // This comment
        $('#comment_text_'+$(this).data('comment-id')).toggle();
        $('#comment_actions_'+$(this).data('comment-id')).toggle();
        // Child comments
        $(this).parents('.comment-list-wrapper').first().find('.comment-list-wrapper').toggle();
        // Change icon
        if ($(this).children('.fa').hasClass('fa-minus-square-o')) {
            $(this).children('.fa').removeClass('fa-minus-square-o').addClass('fa-plus-square-o');
        } else {
            $(this).children('.fa').removeClass('fa-plus-square-o').addClass('fa-minus-square-o');
        }
        RB.initLazyLoad();
    });

    selector_body.on('click', '.js-collapse-img', function() {
        if ($(this).hasClass('collapsed-img')) {
            $(this).removeClass('collapsed-img');
        } else {
            $(this).addClass('collapsed-img');
        }
    })

    RB.collapseCommentImages = function() {
        $('img.js-collapse-img').each(function() {
            console.log(this);
            if (user_defaults.personalisation.collapse_comment_images) {
                $(this).addClass('collapsed-img');
            } else {
                $(this).removeClass('collapsed-img');
            }
        })
    }


    /*
    Lists
    ---------------
    */

    // Display the Drill Downs based on selected tab (parts vs sets)
    RB.setDrillDownView = function() {
        var active_tab = $("ul.nav-tabs li.active a").attr('href');
        if (['#tab_sets', '#tab_mocs', '#tab_buy_sets'].indexOf(active_tab) > -1) {
            $('.js-parts-drill-downs').addClass('hide');
            $('.js-sets-drill-downs').removeClass('hide');
        } else {
            $('.js-parts-drill-downs').removeClass('hide');
            $('.js-sets-drill-downs').addClass('hide');
        }
    };

    // On tab change, hide/show the appropriate Drill Downs
    $("a[href='#tab_parts'], a[href='#tab_buy_parts']").on('shown.bs.tab', function (e) {
        $('.js-parts-drill-downs').removeClass('hide');
        $('.js-sets-drill-downs').addClass('hide');
    });
    $("a[href='#tab_sets'], a[href='#tab_mocs'], a[href='#tab_buy_sets']").on('shown.bs.tab', function() {
        $('.js-parts-drill-downs').addClass('hide');
        $('.js-sets-drill-downs').removeClass('hide');
    });


    /*
    Viewing Inventories
    -------------------
    */

    RB.setInventoryView = function(force_highlight, force_highlight_owned) {
        var color_blind_class = '';
        if (user_defaults['personalisation']['color_blind']) color_blind_class = 'border-color-blind';
        //console.log(user_defaults['personalisation']);
        // Check each part
        $('#inventory .inv_img').each(function(index) {
            var ownership = $(this).find('.js-owner-data');
            var owned = parseInt(ownership.data('owned'));
            $(this).removeClass('border-red border-orange border-green').show();
            if ($('#highlight_missing').is(':checked') || force_highlight) {
                if (owned >= 1 && ownership.data('owned-partial') == 1) {
                    $(this).addClass('border-orange');
                } else if (owned == 0) {
                    $(this).addClass('border-red');
                }
                $(this).addClass(color_blind_class);
            }
            if ($('#highlight_owned').is(':checked') || force_highlight || force_highlight_owned) {
                if (owned >= 1 && ownership.data('owned-partial') == 1) {
                    $(this).addClass('border-orange');
                } else if (owned >= 1 && ownership.data('owned-partial') == 0) {
                    $(this).addClass('border-green');
                }
                $(this).addClass(color_blind_class);
            }
            if ($('#hide_missing').is(':checked')) {
                if (owned == 0) {
                    $(this).hide();
                } else if (!$('#hide_owned').is(':checked')) {
                    $(this).show();
                }
            }
            if ($('#hide_owned').is(':checked')) {
                if (owned >= 1 && ownership.data('owned-partial') == 0) {
                    $(this).hide();
                } else if (owned >= 1 && ownership.data('owned-partial') == 1 && $('#hide_missing').is(':checked')) {
                    $(this).hide(); // Hide partially owned parts if also hiding missing parts
                } else if (!$('#hide_missing').is(':checked')) {
                    $(this).show();
                }
            }
            if ($('#show_part_prices').is(':checked')) {
                $(this).find('.js-part-price').show();
            } else {
                $(this).find('.js-part-price').hide();
            }
        });
    };
    selector_body.on('click', '#highlight_missing, #highlight_owned, #hide_missing, #hide_owned, #show_part_prices', function() {
        RB.setInventoryView();
    });

    RB.setPartPricesView = function() {
        // For My Parts etc not in Inventories with their own overriding view options.
        //console.log(user_defaults['inv']['show_part_prices']);
        if (user_defaults['inv']['show_part_prices'] == true) {
            $('#inventory .inv_img').each(function(index) {
                $(this).find('.js-part-price').show();
            });
        } else {
            $('#inventory .inv_img').each(function(index) {
                $(this).find('.js-part-price').hide();
            });
        }
    };


    /*
    Part Popups
    ------------
    */

    // Display Part Popup Summary
    selector_body.on('click', '.js-part-popup', function() {
        //console.log('hiding modal');
        $('.modal').modal('hide');
        $('#part_popup_div').html('');
        $('#part_popup_modal').modal('show');
        var params = $.param({
            'can_edit': $(this).data('can_edit'),
            'color_id': $(this).data('color_id'),
            'list_part_id': $(this).data('list_part_id'),
            'list_part_type': $(this).data('list_part_type'),
            'has_error': $(this).data('has_error'),
            'page_querystring': encodeURIComponent(location.search),
        });
        // A bit shit forcing it to wait until this js is loaded, but its cached and better than forcing it on
        // every page load when not required.... I guess?
        // Also loaded in part_details.html
        var p = $(this);
        loadScript('/static/plugins/floatThead/jquery.floatThead.min.js?v=2.2.1', function () {
            RB.get_ajax({elem: $('#part_popup_div'), url: p.data("url"), data: params}, function (data) {
                // load My Parts tab on Part Popups
                $('#part_popup_modal .nav-tabs a[href=\\#tab_myparts]').on('shown.bs.tab', function(e) {
                    if ($(this).data('loaded') != '1') {
                        RB.get_ajax({elem: $('#tab_myparts'), url: $(this).data('url')+'?height_limit=300'}, function(data) {
                            RB.initStickyTableHeader();
                        });
                        $(this).attr('data-loaded', '1');
                    }
                });
                _popover(); // re-init popover help items
                RB.setBBCode("bold,italic,underline,strike,fontcolor,|,justifyleft,justifycenter,justifyright,table,|,link");
                $(window).lazyLoadXT({scrollContainer: '#part_popup_modal'});
            });
        });
        return false; // Don't follow link if there was one
    });


    /*
    Parts Display Settings
    -----------------------
    */

    RB.setPartTilesView = function(btn) {
        var container = selector_body;
        var btn_container = '#content';
        if (btn) {
            btn_container = btn.parent('.btn-group');
        }
        //console.log('setPartTilesView');
        if ($(btn_container).find('.js-view-parts-small').hasClass('active')) {
            //console.log('small');
            //console.log(container.find('.inv_img'));
            container.find('.inv_img').each(function() {
                $(this).removeClass('inv_img_small inv_img_med').addClass('inv_img_small');
            });
            RB.initLazyLoad();
        } else if ($(btn_container).find('.js-view-parts-medium').hasClass('active')) {
            //console.log('medium');
            container.find('.inv_img').each(function() {
                $(this).removeClass('inv_img_small inv_img_med').addClass('inv_img_med');
            });
            RB.initLazyLoad();
        } else if ($(btn_container).find('.js-view-parts-large').hasClass('active')) {
            //console.log('large');
            container.find('.inv_img').each(function() {
                $(this).removeClass('inv_img_small inv_img_med');
            });
        }
    };
    RB.setPartTilesView();

    /* Customise Part Display */
    selector_body.on('click', '.js-view-parts-small, .js-view-parts-medium, .js-view-parts-large', function() {
        RB.setPartTilesView($(this));
    });

    RB.setSetTilesView = function(btn) {
        var container = selector_body;
        var btn_container = '#content';
        if (btn) {
            btn_container = btn.parent('.btn-group');
        }
        //console.log('setSetTilesView');
        if ($(btn_container).find('.js-view-sets-small').hasClass('active')) {
            //console.log('small');
            //console.log(container.find('.js-set'));
            container.find('.js-set').each(function() {
                $(this).removeClass('set-tn-small set-tn-med').addClass('set-tn-small');
                $(this).find('.js-set-actions').hide();
                $(this).find('.js-set-details-parts').hide();
                $(this).find('.js-set-details-num').removeClass('col-xs-6');
                $(this).find('.js-set-details-themeyear').hide();
                $(this).find('.js-set-name').hide();
            });
            RB.initLazyLoad();
        } else if ($(btn_container).find('.js-view-sets-medium').hasClass('active')) {
            container.find('.js-set').each(function() {
                $(this).removeClass('set-tn-small set-tn-med').addClass('set-tn-med');
                $(this).find('.js-set-actions').show();
                $(this).find('.js-set-details-parts').hide();
                $(this).find('.js-set-details-num').removeClass('col-xs-6');
                $(this).find('.js-set-details-themeyear').hide();
                $(this).find('.js-set-name').show();
                //$(this).find('.label-dark-blue').hide();
            });
            RB.initLazyLoad();
        } else if ($(btn_container).find('.js-view-sets-large').hasClass('active')) {
            container.find('.js-set').each(function() {
                $(this).removeClass('set-tn-small set-tn-med');
                $(this).find('.js-set-actions').show();
                $(this).find('.js-set-details-parts').show();
                $(this).find('.js-set-details-num').addClass('col-xs-6');
                $(this).find('.js-set-details-themeyear').show();
                $(this).find('.js-set-name').show();
                $(this).find('.label-dark-blue').show();
            });
        }
    };
    RB.setSetTilesView();

    /* Customise Set Display */
    selector_body.on('click', '.js-view-sets-small, .js-view-sets-medium, .js-view-sets-large', function() {
        RB.setSetTilesView($(this));
    });

    /*
    Buy Parts/Sets
    --------------
    */

    RB.getPartsList = function(parent_elem) {
        var elements = $(parent_elem).find('.js-part-data');
        var parts = [];
        $.each(elements, function(idx, item) {
            if ($(item).data('is_spare') != '1') {
                parts.push({
                    'part_id': $(item).data('part_id'),
                    'color_id': $(item).data('color_id'),
                    'quantity': $(item).data('quantity')
                });
            }
        });
        return parts
    };

    RB.getPartsListForBrickLink = function(parent_elem) {
        // eg [{"type":"part","no":"10197","color":"85","qty":"3"},{"type":"part"...
        var elements = $(parent_elem).find('.js-part-data');
        var parts = [];
        $.each(elements, function(idx, item) {
            parts.push({'type': 'part',
                        'no': $(item).data('part_id'),
                        'color': $(item).data('color_id'),
                        'qty': $(item).data('quantity')});
        });
        return parts
    };

    RB.getSetsList = function(parent_elem) {
        var elements = $(parent_elem).find('.set-tn');
        var sets = [];
        $.each(elements, function(idx, item) {
            sets.push({'set_id': $(item).data('set_id'),
                       'quantity': $(item).data('quantity')});
        });
        return sets
    };

    // Load a list of stores and prices for parts
    var g_parts_stores_xhr;
    RB.getPartsStores = function(items_to_buy_parent_elem, forms_to_post_parent_elem, url, export_parts_url) {
        if (g_parts_stores_xhr) {
            g_parts_stores_xhr.abort();
        }
        var parts = RB.getPartsList(items_to_buy_parent_elem);
        var post_data = {};
        post_data['parts'] = JSON.stringify(parts); // so parts array is left unmolested
        post_data['export_parts_url'] = export_parts_url; // To be passed back as export link on BL timeouts
        if (!forms_to_post_parent_elem) forms_to_post_parent_elem = '#content';
        var forms = $(forms_to_post_parent_elem).find('form');
        $.each(forms, function(idx, form) {
            $.extend(post_data, getFormJSON($(form)));
        });
        $('#buy_parts_count').html('?');
        g_parts_stores_xhr = RB.post_ajax({elem: $('#part_stores_list'), url: url, data: JSON.stringify(post_data)}, function(data) {
            $('#buy_parts_count').html(data.num_stores);

            // Run again, using BrickLink API (much slower but more results)
            var use_bricklink_api = false;
            $.each(forms, function(idx, form) {
                if ($(form).find('input[name=inc_bricklink]').prop('checked')) {
                    use_bricklink_api = true;
                }
            });
            // Only run again if user actually wants Bricklink results
            if (use_bricklink_api) {
                url = url + 'blapi/?use_bricklink_api=1';
                g_parts_stores_xhr = RB.post_ajax({
                    elem: $('#bricklink_api_pending_msg'),
                    html: $('#part_stores_list'),
                    url: url,
                    data: JSON.stringify(post_data)
                }, function (data) {
                    $('#buy_parts_count').html(data.num_stores);
                });
            }
        });
    };

    // Load a list of stores and prices for sets
    var g_sets_stores_xhr;
    RB.getSetsStores = function(items, forms_to_post_parent_elem) {
        if (g_sets_stores_xhr) {
            g_sets_stores_xhr.abort();
        }
        var data = {};
        data['sets'] = JSON.stringify(items);
        if (!forms_to_post_parent_elem) forms_to_post_parent_elem = '#content';
        var forms = $(forms_to_post_parent_elem).find('form');
        $.each(forms, function(idx, form) {
            $.extend(data, getFormJSON($(form)));
        });
        $('#buy_sets_count').html('?');
        g_sets_stores_xhr = RB.post_ajax({elem: $('#set_stores_list'), url: '/stores/search/sets/slow/', data: JSON.stringify(data)}, function(data) {
            $('#buy_sets_count').html(data.num_stores);
        });
    };
    // Load a list of stores and prices for a single set
    RB.getSetStoresSingle = function(set_num, forms_to_post_parent_elem) {
        RB.getSetsStores([{'set_id': set_num, 'quantity': 1}], forms_to_post_parent_elem);
    };
    // Load a list of stores and prices for sets
    RB.getSetStoresMultiple = function(items_to_buy_parent_elem, forms_to_post_parent_elem) {
        var sets = RB.getSetsList(items_to_buy_parent_elem);
        RB.getSetsStores(sets, forms_to_post_parent_elem);
    };

    // Click on Add to Cart for a store
    selector_body.on('click', '.js-add-to-cart', function() {
        var form = $(this).children('form');
        var store_type = $(this).data('store_type');
        var data;
        if (store_type == 'BrickLink') {
            data = form.find('input[name=inventories]').val();
        } else {
            data = form.find('input[name=data]').val();
        }
        data = $.param({
            'store_id': $(this).data('store_id'),
            'data': data,
            'cost': $(this).data('cost'),
            'type': $(this).data('type'),
        });
        RB.post_ajax({elem: $(this), url: '/external/buy/', data: data}, function(resp) {
            // This supposedly fixes "Form submission canceled because the form is not connected"
            // http://stackoverflow.com/questions/42053775/getting-error-form-submission-canceled-because-the-form-is-not-connected
            $(document.body).append(form);
            // POST the data to the external site
            $(form).submit();
        });
        return false;
    });

    // Clicked the info icon next to a store - show the parts included in the store
    selector_body.on('click', '.js-buy-parts-info', function() {
        $('#buy_parts_info_modal').modal();
        $('#buy_parts_info_modal #store_id').html($(this).data('store_name'));
        var data = 'included='+JSON.stringify($(this).data('included_parts')) +
            '&excluded='+JSON.stringify($(this).data('excluded_parts')) +
            '&store_id='+$(this).data('store_id');
        RB.post_ajax({
            elem: $('#included_parts, #excluded_parts'),
            url: '/stores/parts/slow/',
            data: data
        }, function(resp) {
            //$('#included_parts').html(resp.included_html);
            //$('#excluded_parts').html(resp.excluded_html);
            var sort_data1 = user_defaults['inv']['sort_parts_data1'];
            var sort_data2 = user_defaults['inv']['sort_parts_data2'];
            $('.js-sort-part').removeClass('active');
            $('.js-sort-part input[value='+user_defaults['inv']['sort_parts_by']+']').parent('label').addClass('active');
            RB.sort_items('#included_parts', '#included_parts .js-part', '.js-part-data', sort_data1, sort_data2);
            RB.sort_items('#excluded_parts', '#excluded_parts .js-part', '.js-part-data', sort_data1, sort_data2);
            // didnt work, why?
            //$('#included_parts').lazyLoadXT({forceLoad: true}); // lazy load any new images
            //$('#excluded_parts').lazyLoadXT({forceLoad: true}); // lazy load any new images
        });
        return false;
    });

    // Clicked the info icon next to a store - show the sets included in the store
    selector_body.on('click', '.js-buy-sets-info', function() {
        $('#buy_sets_info_modal').modal();
        $('#buy_sets_info_modal #store_id').html($(this).data('store_name'));
        var data = 'included='+JSON.stringify($(this).data('included_sets')) +
            '&excluded='+JSON.stringify($(this).data('excluded_sets')) +
            '&store_id='+$(this).data('store_id');
        RB.post_ajax({
            elem: $('#included_sets, #excluded_sets'),
            url: '/stores/sets/slow/',
            data: data
        });
        return false;
    });

    // Clicked Multi-Buy link on Buy Table
    selector_body.on('click', '.js-post-multibuy', function() {
        // TODO: should I get the tab_parts id from a data- parameter?
        var parts = RB.getPartsList('#tab_parts');
        var data = {};
        data['parts'] = JSON.stringify(parts); // so parts array is left unmolested
        $('#multibuy_form input[name=items]').val(data['parts']);
        $('#multibuy_form').submit();
    });


    /*
    BrickOwl Wishlists
    ------------------
    */

    // Clicked 'Get Wishlists' on Add Parts to BrickOwl Wishlist modal
    selector_body.on('submit', '#brickowl_key_wishlists_form', function() {
        RB.load_modal({
            modal: '#import_brickowl_wishlist_modal',
            elem: $('#brickowl_wishlists_div'),
            url: $(this).attr('action'),
            data: $(this).serialize(),
        }, function(data) {
            if (data.status == 'success') {
                RB.initDataTables('#brickowl_wishlists_table');
            } else {
                $('#brickowl_wishlists_div').html(data.msg);
            }
        });
        return false; // don't submit form
    });

    // Clicked 'Add Parts' on a BrickOwl Wishlist
    selector_body.on('click', '.js-export-brickowl-parts-wishlist', function() {
        var parts = RB.getPartsList('#tab_parts');
        if (parts.length > 0) {
            var data = {};
            data['parts'] = JSON.stringify(parts); // so parts array is left unmolested
            data['key'] = $(this).data('key');
            RB.post_ajax({elem: $('#add_to_brickowl_wishlist_msg'), url: $(this).data('url'), data: JSON.stringify(data)});
        } else {
            RB.show_error('No parts on this page to export');
        }
        return false; // don't submit #brickowl_key_form
    });

    // Clicked 'Add Parts' on a BrickOwl Wishlist - Create New Wishlist
    selector_body.on('click', '.js-create-export-brickowl-parts-wishlist', function() {
        var parts = RB.getPartsList('#tab_parts');
        if (parts.length > 0) {
            // part_id, color_id, quantity
            var data = {};
            data['parts'] = JSON.stringify(parts); // so parts array is left unmolested
            data['key'] = $(this).data('key');
            data['wishlist_name'] = $('#brickowl_wishlists_table input[name=new_wishlist_name]').val();
            RB.post_ajax({elem: $('#add_to_brickowl_wishlist_msg'), url: $(this).data('url'), data: JSON.stringify(data)});
        } else {
            RB.show_error('No parts on this page to export');
        }
        return false; // don't submit #brickowl_key_form
    });


    /*
    BrickLink Wanted Lists
    ----------------------
    */

    // Export to BrickLink Wanted List via API
	selector_body.on('click', '.js-add-parts-to-bricklink-wanted-list', function() {
        //var parts = '[{"type":"part","no":"10197","color":"85","qty":"3"},{"type":"part","no":"11214","color":"85","qty":"10"},{"type":"part","no":"11455","color":"11","qty":"2"},{"type":"part","no":"11478","color":"11","qty":"4"},{"type":"part","no":"11950","color":"86","qty":"2"},{"type":"part","no":"11954","color":"5","qty":"2"},{"type":"part","no":"14720","color":"86","qty":"1"},{"type":"part","no":"15100","color":"11","qty":"21"},{"type":"part","no":"15462","color":"69","qty":"4"},{"type":"part","no":"16511","color":"86","qty":"1"},{"type":"part","no":"2412b","color":"17","qty":"2"},{"type":"part","no":"2654","color":"11","qty":"1"},{"type":"part","no":"2654","color":"12","qty":"2"},{"type":"part","no":"2741","color":"11","qty":"1"},{"type":"part","no":"2780","color":"11","qty":"149"},{"type":"part","no":"2817","color":"11","qty":"2"},{"type":"part","no":"2825","color":"5","qty":"8"},{"type":"part","no":"2825","color":"86","qty":"2"},{"type":"part","no":"2850","color":"86","qty":"6"},{"type":"part","no":"2851","color":"3","qty":"6"},{"type":"part","no":"2852","color":"86","qty":"6"},{"type":"part","no":"2853","color":"3","qty":"2"},{"type":"part","no":"2854","color":"85","qty":"2"},{"type":"part","no":"3021","color":"11","qty":"2"},{"type":"part","no":"3022","color":"11","qty":"2"},{"type":"part","no":"32009","color":"11","qty":"4"},{"type":"part","no":"32009","color":"86","qty":"1"},{"type":"part","no":"32013","color":"11","qty":"6"},{"type":"part","no":"32013","color":"5","qty":"3"},{"type":"part","no":"32013","color":"1","qty":"2"},{"type":"part","no":"32014","color":"11","qty":"10"},{"type":"part","no":"32015","color":"11","qty":"9"},{"type":"part","no":"32015","color":"1","qty":"4"},{"type":"part","no":"32016","color":"11","qty":"2"},{"type":"part","no":"32019","color":"11","qty":"2"},{"type":"part","no":"32034","color":"11","qty":"10"},{"type":"part","no":"32034","color":"5","qty":"4"},{"type":"part","no":"32034","color":"1","qty":"5"},{"type":"part","no":"32034","color":"86","qty":"7"},{"type":"part","no":"32039","color":"11","qty":"9"},{"type":"part","no":"32039","color":"5","qty":"2"},{"type":"part","no":"32054","color":"11","qty":"4"},{"type":"part","no":"32054","color":"5","qty":"9"},{"type":"part","no":"32054","color":"86","qty":"8"},{"type":"part","no":"32062","color":"5","qty":"61"},{"type":"part","no":"32063","color":"86","qty":"4"},{"type":"part","no":"32072","color":"11","qty":"2"},{"type":"part","no":"32073","color":"86","qty":"5"},{"type":"part","no":"4265c","color":"86","qty":"1"},{"type":"part","no":"32140","color":"11","qty":"8"},{"type":"part","no":"32140","color":"5","qty":"10"},{"type":"part","no":"32140","color":"86","qty":"6"},{"type":"part","no":"32184","color":"11","qty":"2"},{"type":"part","no":"32184","color":"86","qty":"3"},{"type":"part","no":"32192","color":"11","qty":"4"},{"type":"part","no":"32269","color":"2","qty":"3"},{"type":"part","no":"32270","color":"11","qty":"3"},{"type":"part","no":"32271","color":"11","qty":"8"},{"type":"part","no":"32278","color":"11","qty":"1"},{"type":"part","no":"32291","color":"11","qty":"2"},{"type":"part","no":"32316","color":"11","qty":"12"},{"type":"part","no":"32316","color":"5","qty":"11"},{"type":"part","no":"32316","color":"86","qty":"2"},{"type":"part","no":"32333","color":"86","qty":"2"},{"type":"part","no":"32348","color":"86","qty":"2"},{"type":"part","no":"32449","color":"11","qty":"8"},{"type":"part","no":"32449","color":"5","qty":"4"},{"type":"part","no":"32523","color":"11","qty":"10"},{"type":"part","no":"32523","color":"5","qty":"1"},{"type":"part","no":"32523","color":"86","qty":"2"},{"type":"part","no":"32524","color":"11","qty":"1"},{"type":"part","no":"32524","color":"86","qty":"2"},{"type":"part","no":"32525","color":"5","qty":"5"},{"type":"part","no":"32525","color":"1","qty":"1"},{"type":"part","no":"32526","color":"5","qty":"2"},{"type":"part","no":"32556","color":"2","qty":"2"},{"type":"part","no":"32557","color":"5","qty":"2"},{"type":"part","no":"33299","color":"11","qty":"2"},{"type":"part","no":"3705","color":"11","qty":"21"},{"type":"part","no":"3706","color":"11","qty":"7"},{"type":"part","no":"3707","color":"11","qty":"1"},{"type":"part","no":"3713","color":"5","qty":"6"},{"type":"part","no":"3713","color":"86","qty":"2"},{"type":"part","no":"3749","color":"2","qty":"4"},{"type":"part","no":"3941","color":"11","qty":"5"},{"type":"part","no":"3941","color":"19","qty":"1"},{"type":"part","no":"4032","color":"11","qty":"2"},{"type":"part","no":"40490","color":"5","qty":"4"},{"type":"part","no":"40490","color":"1","qty":"1"},{"type":"part","no":"40490","color":"86","qty":"6"},{"type":"part","no":"41239","color":"11","qty":"2"},{"type":"part","no":"41239","color":"5","qty":"1"},{"type":"part","no":"41239","color":"86","qty":"2"},{"type":"part","no":"41677","color":"11","qty":"6"},{"type":"part","no":"42003","color":"11","qty":"10"},{"type":"part","no":"42003","color":"5","qty":"2"},{"type":"part","no":"42003","color":"86","qty":"7"},{"type":"part","no":"43093","color":"7","qty":"47"},{"type":"part","no":"43857","color":"11","qty":"10"},{"type":"part","no":"44294","color":"86","qty":"4"},{"type":"part","no":"44772","color":"11","qty":"2"},{"type":"part","no":"44809","color":"11","qty":"2"},{"type":"part","no":"4519","color":"86","qty":"28"},{"type":"part","no":"45590","color":"11","qty":"2"},{"type":"part","no":"48989","color":"86","qty":"1"},{"type":"part","no":"54120","color":"11","qty":"2"},{"type":"part","no":"58122c01","color":"86","qty":"1"},{"type":"part","no":"58123bc01","color":"86","qty":"1"},{"type":"part","no":"32209","color":"85","qty":"4"},{"type":"part","no":"6538c","color":"11","qty":"5"},{"type":"part","no":"6538c","color":"5","qty":"5"},{"type":"part","no":"6538c","color":"3","qty":"4"},{"type":"part","no":"6538c","color":"86","qty":"4"},{"type":"part","no":"60483","color":"86","qty":"10"},{"type":"part","no":"60484","color":"11","qty":"11"},{"type":"part","no":"60485","color":"86","qty":"2"},{"type":"part","no":"4073","color":"12","qty":"2"},{"type":"part","no":"4073","color":"98","qty":"4"},{"type":"part","no":"62520c01","color":"86","qty":"4"},{"type":"part","no":"62462","color":"11","qty":"24"},{"type":"part","no":"62531","color":"1","qty":"2"},{"type":"part","no":"62821b","color":"85","qty":"1"},{"type":"part","no":"63869","color":"11","qty":"6"},{"type":"part","no":"64179","color":"86","qty":"2"},{"type":"part","no":"64781","color":"11","qty":"1"},{"type":"part","no":"64782","color":"5","qty":"1"},{"type":"part","no":"64782","color":"1","qty":"1"},{"type":"part","no":"6536","color":"11","qty":"9"},{"type":"part","no":"6536","color":"5","qty":"4"},{"type":"part","no":"6536","color":"86","qty":"4"},{"type":"part","no":"6542b","color":"85","qty":"1"},{"type":"part","no":"6553","color":"11","qty":"1"},{"type":"part","no":"6558","color":"7","qty":"69"},{"type":"part","no":"6587","color":"85","qty":"9"},{"type":"part","no":"6589","color":"2","qty":"3"},{"type":"part","no":"6629","color":"11","qty":"10"},{"type":"part","no":"6632","color":"11","qty":"8"},{"type":"part","no":"6632","color":"5","qty":"4"},{"type":"part","no":"6632","color":"86","qty":"2"},{"type":"part","no":"86652","color":"86","qty":"2"},{"type":"part","no":"87079","color":"11","qty":"2"},{"type":"part","no":"87082","color":"11","qty":"2"},{"type":"part","no":"87082","color":"86","qty":"1"},{"type":"part","no":"87083","color":"85","qty":"13"},{"type":"part","no":"92908","color":"86","qty":"2"},{"type":"part","no":"92909","color":"85","qty":"4"},{"type":"part","no":"94925","color":"86","qty":"6"},{"type":"part","no":"99009","color":"86","qty":"2"},{"type":"part","no":"99010","color":"11","qty":"2"},{"type":"part","no":"99498c01","color":"86","qty":"1"},{"type":"part","no":"99499c01","color":"86","qty":"2"},{"type":"part","no":"99773","color":"11","qty":"4"}]';
        var data_elem = $(this);
        var parts = RB.getPartsList('#tab_parts');
        // Convert ids to BrickLink ids
        RB.post_ajax({elem: $(this), url: $(this).data('url'), data: 'parts='+JSON.stringify(parts)}, function(data) {
            console.log(data.parts);

            bl_handler = new BRICKLINK.apps.flow( {
                callbackFunction : function () {
                    bl_handler.closeFlow();
                }
            } );

            try {
                bl_handler.startFlow(
                    "https://www.bricklink.com/v2/affiliate/wantedlist.page",
                    {
                        parts: data.parts,
                        title: data_elem.data('title'),
                        totalParts: data_elem.data('total'),
                        missingParts: data_elem.data('missing'),
                        imageUrl: data_elem.data('img')
                    }
                );
            } catch(err) {
                console.log(err);
                show_js_error('There was a problem opening the BrickLink window, probably because the popup was blocked by your browser. Please enable popups for this site and reload the page.');
            }
        });
	});


    /*
    Sorting
    -----------
    */

    RB.sort_items = function(container, items, item_data, sort1, sort2, sort_dir) {
        console.log('Sort: ' + container + ' ' + items + ' ' + item_data + ' ' + sort1 + ' ' + sort2 + ' ' + sort_dir);
        $(items).detach().sort(function(a,b) {
            var a1 = $(a).find(item_data).data(sort1);
            var a2 = $(b).find(item_data).data(sort1);
            // parseFloat ignores non numeric characters so set_num sorting works pretty well
            a1 = parseFloat(a1);
            a2 = parseFloat(a2);
            if (isNaN(a1)) a1 = $(a).find(item_data).data(sort1);
            if (isNaN(a2)) a2 = $(b).find(item_data).data(sort1);
            if (sort_dir == 'D') {
                var tmp = a1; a1 = a2; a2 = tmp;
            }
            if (a1 > a2) return 1;
            else if (a1 == a2) {
                var b1 = $(a).find(item_data).data(sort2);
                var b2 = $(b).find(item_data).data(sort2);
                if (sort_dir == 'D') {
                    var tmp = b1; b1 = b2; b2 = tmp;
                }
                if (b1 > b2) return 1;
                else return -1;
            }
            else return -1;
        }).appendTo(container);
        RB.initLazyLoad(); // lazy load any images that popped into view from below the viewport
    };

    RB.default_sort_items = function(container) {
        RB.sort_items(container, container + ' .js-part', '.js-part-data',
            user_defaults['inv']['sort_parts_data1'], user_defaults['inv']['sort_parts_data2'], user_defaults['inv']['sort_parts_dir']);
    };
    RB.default_sort_sets = function(container) {
        RB.sort_items(container, container + ' .js-set', '.js-sort-data',
            user_defaults['inv']['sort_sets_data1'], user_defaults['inv']['sort_sets_data2'], user_defaults['inv']['sort_sets_dir']);
    };

    // Clicked a Sort Parts button
    selector_body.on('click', '.js-sort-part', function() {
        var reload_page = $(this).parent().data('reload_page');
        var sort_by = $(this).data('sort_by');
        var sort_dir = $(this).data('sort_dir');
        var new_url = RB.replaceURLParam(location.search, 'sort_parts_by', sort_by);
        // The browser seems to load the page with the existing hash, including it again encodes it
        new_url = RB.replaceURLParam(new_url, 'sort_parts_dir', sort_dir);// + location.hash;
        if (reload_page) {
            // Reload page for server sorting (eg for paginated items)
            location.search = new_url;
        } else {
            // In-place Javascript sort
            var sort1 = $(this).data('sort1');
            var sort2 = $(this).data('sort2');
            var items = $(this).parent().data('items');
            var options = $(this).find('i.fa');
            options.parent().parent().parent().find('i.fa').removeClass('fa-sort-amount-asc fa-sort-amount-desc');
            if (sort_dir == 'A') {
                options.addClass('fa-sort-amount-asc');
                $(this).data('sort_dir', 'D');
            } else {
                options.addClass('fa-sort-amount-desc');
                $(this).data('sort_dir', 'A');
            }
            var html = '';
            if (sort_dir == 'A') html = '<i class="fa fa-fw fa-sort-amount-asc"></i> ';
            else html = '<i class="fa fa-fw fa-sort-amount-desc"></i> ';
            html += $(this).data('sort_by_name');
            $(this).parent().parent().find('.js-sort-part-current').html(html);
            var url = $(this).data('url');
            if (url) {
                // Save default settings
                RB.post_ajax({
                    elem: $(''),
                    url: url,
                    data: 'sort_parts_by=' + sort_by + '&sort_parts_dir=' + sort_dir
                });
            }
            $.each($(items), function() {
                // There may be multiple containers if the page is grouped by something
                //console.log($(this));
                RB.sort_items($(this), $(this).find('.js-part'), '.js-part-data', sort1, sort2, sort_dir);
            });
            // Update URL in case of refresh
            history.pushState(null, null, new_url);
            // Update any Export links on the page to use the new sort
            $.each($('.js-export-parts-list a'), function() {
                $(this).attr('href', RB.replaceURLParam($(this).attr('href'), 'sort_parts_by', sort_by));
                $(this).attr('href', RB.replaceURLParam($(this).attr('href'), 'sort_parts_dir', sort_dir));
            });
        }
        event.preventDefault(); // better than return false - closes the dropdown but still doesnt follow the A link
    });

    // Clicked a Sort Sets button (sets must be wrapped in .js-set to be sortable
    selector_body.on('click', '.js-sort-set', function() {
        var reload_page = $(this).parent().data('reload_page');
        var sort_by = $(this).data('sort_by');
        var sort_dir = $(this).data('sort_dir');
        var new_url = RB.replaceURLParam(location.search, 'sort_sets_by', sort_by);
        // The browser seems to load the page with the existing hash, including it again encodes it
        new_url = RB.replaceURLParam(new_url, 'sort_sets_dir', sort_dir);// + location.hash;
        if (g_debug) { console.log(new_url); }
        if (reload_page) {
            // Reload page for server sorting (eg for paginated items)
            location.search = new_url;
        } else {
            // In-place Javascript sort
            var sort1 = $(this).data('sort1');
            var sort2 = $(this).data('sort2');
            var items = $(this).parent().data('items');
            var options = $(this).find('i.fa');
            if (g_debug) { console.log(items); }
            options.parent().parent().parent().find('i.fa').removeClass('fa-sort-amount-asc fa-sort-amount-desc');
            if (sort_dir == 'A') {
                options.addClass('fa-sort-amount-asc');
                $(this).data('sort_dir', 'D');
            } else {
                options.addClass('fa-sort-amount-desc');
                $(this).data('sort_dir', 'A');
            }
            var html = '';
            if (sort_dir == 'A') html = '<i class="fa fa-fw fa-sort-amount-asc"></i> ';
            else html = '<i class="fa fa-fw fa-sort-amount-desc"></i> ';
            html += $(this).data('sort_by_name');
            $(this).parent().parent().find('.js-sort-set-current').html(html);
            var url = $(this).data('url');
            if (url) {
                // Save default settings
                RB.post_ajax({
                    elem: $(''),
                    url: url,
                    data: 'sort_sets_by=' + sort_by + '&sort_sets_dir=' + sort_dir
                });
            }
            $.each($(items), function() {
                // There may be multiple containers if the page is grouped by something
                //console.log($(this));
                RB.sort_items($(this), $(this).find('.js-set'), '.js-sort-data', sort1, sort2, sort_dir);
            });
            // Update URL in case of refresh
            history.pushState(null, null, new_url);
            // Update any Export links on the page to use the new sort
            $.each($('.js-export-sets-list a'), function() {
                $(this).attr('href', RB.replaceURLParam($(this).attr('href'), 'sort_sets_by', sort_by));
                $(this).attr('href', RB.replaceURLParam($(this).attr('href'), 'sort_sets_dir', sort_dir));
            });
        }
        event.preventDefault(); // better than return false - closes the dropdown but still doesnt follow the A link
    });


    /*
    Drill Downs
    --------------
    */


    // Change Grouping on a list
    selector_body.on('change', '.js-group-by-list', function() {
        //console.log('group by changed');
        var reload_page = $(this).data('reload_page');
        var group_by = $(this).val();
        var new_url = RB.replaceURLParam(location.search, 'group_by', group_by);
        if (reload_page) {
            // Reload page for server sorting (eg for paginated items)
            $(this).spin();
            location.search = new_url;
        } else {
            // TODO: support in-page grouping
        }
    });

    RB.applyDrillDowns = function(btn) {
        console.log('apply drill downs');
        // Find all visible filters (so don't count twice and allow unchecking for filters with all lists)
        var inputs = btn.parent().parent().parent().find('input.js-drill-down-filter:visible');
        var filter_params = {};
        $.each(inputs, function() {
            if ($(this).is(':checked')) {
                if (!($(this).data('name') in filter_params)) {
                    filter_params[$(this).data('name')] = $(this).val()
                } else {
                    filter_params[$(this).data('name')] += ',' + $(this).val();
                }
            }
        });
        console.log(filter_params);

        var new_url = location.search;
        $.each(filter_params, function(key, value) {
            new_url = RB.replaceURLParam(new_url, key, value);
        });
        console.log(new_url);
        if (btn.data('ajax') == '1') {
            // Used by eg Find Sets
            var context = {elem: btn, url: new_url};
            //if ($($(this).data('html')).length) {
            //    context.html = $($(this).data('html'));
            //}
            var js = btn.data('js');
            RB.get_ajax(context, function (data) {
                history.pushState({}, null, new_url);
                if (js) {
                    eval(js);
                }
            });
        } else {
            location.search = new_url;
        }
    };

    // Search box in drill downs
    selector_body.on('submit', 'form.js-drill-down-search', function() {
        var input = $(this).find('input[name=q]');
        var new_url = location.search;
        new_url = RB.replaceURLParam(new_url, 'q', input.val());
        console.log(new_url);
        if ($(this).data('ajax') == '1') {
            // Used by eg Find Sets
            var context = {elem: $(this).find('.btn'), url: new_url};
            var js = $(this).data('js');
            RB.get_ajax(context, function (data) {
                history.pushState({}, null, new_url);
                if (js) {
                    eval(js);
                }
            });
            return false;
        } else {
            location.search = new_url;
            return false;
        }
    });

    // Apply button in drill downs
    selector_body.on('click', '.js-apply-drill-down-multi-filter', function() {
        RB.applyDrillDowns($(this));
    });

    selector_body.on('click', '.js-drill-down-check-none', function() {
        var field = $(this).data('name');
        //console.log(field);
        $('input.js-drill-down-filter[data-name="'+field+'"]').prop('checked', false);
        return false;
    });

    selector_body.on('click', '.js-drill-down-check-all', function() {
        var field = $(this).data('name');
        //console.log(field);
        $('input.js-drill-down-filter[data-name="'+field+'"]').prop('checked', true);
        return false;
    });

    selector_body.on('click', '.js-drill-down-show-alllist, .js-drill-down-hide-alllist', function() {
        var field = $(this).data('name');
        //console.log(field);
        $('ul.js-drill-down-list-'+field).toggle();
        $('ul.js-drill-down-alllist-'+field).toggle();
        $(this).parent().parent().find('.js-drill-down-show-alllist').toggle();
        $(this).parent().parent().find('.js-drill-down-hide-alllist').toggle();
        return false;
    });



    /*
    MOC Details
    --------------
    */

	// Load Bricksafe gallery data
	/*RB.load_bricksafe_gallery = function(url, thumbs_only, default_num_files) {
	    console.log('load_bricksafe_gallery ' + url);
		var tn_size = 130; // matches bricksafe's small tn size to save disk space
		var num_files = 6; // +1 for the main image
        if (default_num_files) {
            num_files = default_num_files;
        }
        if (url && url.indexOf('bricksafe.com') > -1) {
            url = url.replace('http:', 'https:');
            var api_url = url.replace('bricksafe.com', 'bricksafe.com/api');

            if (thumbs_only) {
                num_files = 6;
                //$('#bricksafe_gallery').html(RB.spinner);
                $('#bricksafe_gallery').spin();
            }
            var slides = $('.flexsliderX ul.slides');
            // The first is the main image, used to size other images. If it's errored or not loaded yet, the
            // gallery will use an incorrect size.
            var slider_item = slides.children('li').first();
            //console.log(slider_item);
            //console.log(slider_item.children('img').first().prop('complete'));

            do_load = function() {
                console.log('Loading Bricksafe ' + api_url);
                $.ajax({
                    type: "GET",
                    url: api_url,
                    dataType: 'json',
                    data: {limit: num_files}
                }).done(function (data, textStatus, jqXHR) {
                    var tn = '';
                    if (data.files.length < num_files) num_files = data.files.length;
                    if (num_files > 1) {
                        // Only bother if at least two images
                        for (var i = 0; i < num_files; i++) {
                            var file = data.files[i];
                            //file.file_url = file.file_url.replace("'", "&quot;");
                            //file.file_url = file.file_url.replace("#", "%23");
                            file.file_url = encodeURI(file.file_url);
                            file.file_url = file.file_url.replace("#", "%23");
                            file.file_url = file.file_url.replace("'", "%27");
                            console.log(file.file_url);
                            var file_extension = '';
                            file_extension = file.file_url.split('/').pop();
                            if (file_extension.includes('.')) {
                                file_extension = '.' + file_extension.split('.').pop();
                            } else {
                                file_extension = '';
                            }
                            var img_full = file.file_url + '/' + parseInt(slider_item.width()) + 'x' + parseInt(slider_item.height()) + 'p' + file_extension;
                            var img_tn = file.file_url + '/' + tn_size + 'x' + tn_size + file_extension;

                            if (thumbs_only) {
                                tn += "<div class='col-xs-6 col-sm-2'> \
                                 <a href='" + file.file_url + "'> \
                                 <img src='" + file.file_url + "/" + tn_size + "x" + tn_size + ".jpg' title='" + file.file_name + "'> \
                                 </a> \
                                 </div>";
                                $('#bricksafe_gallery').html("<div class='row mb-20'>" + tn + "</div>");
                            } else {
                                var new_slider_item = slider_item.clone();
                                new_slider_item.attr('data-thumb', img_tn);
                                new_slider_item.find('img').removeAttr('data-src'); // make sure lazy loaded 1st image doesn't affect others
                                new_slider_item.find('img').removeAttr('width'); // thumbs diff size to 1st img
                                new_slider_item.find('img').removeAttr('height'); // thumbs diff size to 1st img
                                new_slider_item.find('img').attr('src', img_full); // no advantage to lazy loading these new ones?
                                // Causes images to pile up vertically without the max-height/overflow styles
                                slides.css('max-height', slider_item.height());
                                new_slider_item.appendTo(slides);
                            }

                        }
                        var slider = $('.flexsliderX').addClass('flexslider');
                        // https://woocommerce.com/flexslider/
                        _flexslider();
                        $('.bricksafe_link').html("<p><a href='" + url + "' target='_blank'>" + "See the full gallery at Bricksafe <i class='fa fa-external-link'></i></a></p>");
                    } else {
                        $('#bricksafe_gallery').unspin();
                    }
                }).fail(function (xhr) {
                    //$('#bricksafe_gallery').html('');
                    $('#bricksafe_gallery').unspin();
                    $('#bricksafe_gallery').html('<div class="alert alert-danger">Error - could not retrieve Bricksafe page details. Make sure your page is marked as Public.</div>');
                });
            };
            check_img_loaded = function() {
                // Wait for first image to fully load so we get accurate image dimensions
                console.log(slider_item);
                if (thumbs_only || slider_item.children('img').first().prop('complete')) {
                    do_load();
                } else {
                    console.log('sllider image not ready yet, wait a bit');
                    window.setTimeout(function () {
                        check_img_loaded();
                    }, 1000);
                }
            };
            check_img_loaded();
        } else {
            $('#bricksafe_gallery').html('');
        }
	};*/


    /*
    User Plans
    ----------
    */

    $('.js-price-change').on('click', function() {
        $('.js-price-monthly').hide();
        $('.js-price-yearly').hide();
        $('.js-price-beerly').hide();
        $('.js-price-'+$(this).data('period')).show();
        return false;
    });

    RB.set_plan_options = function() {
        var plan_type = $('#plan_options input[name=plan_type]:checked').val();
        var plan_term = $('#plan_options input[name=plan_term]:checked').val();
        $('[class*=js-stripe-]').hide();
        $('[class*=js-paypal-]').hide();
        $('[class*=js-plan-price-]').hide();
        $('.js-stripe-'+plan_type+'-'+plan_term).show();
        $('.js-paypal-'+plan_type+'-'+plan_term).show();
        $('.js-plan-price-'+plan_type+'-'+plan_term).show();
        $('#stripe-payment-form input[name=plan]').val($('.js-plan-price-'+plan_type+'-'+plan_term).data('plan_id'));
        $('#paypal-button-container').attr('paypal_plan_id', $('.js-plan-price-'+plan_type+'-'+plan_term).data('paypal_plan_id'));
    };
    $('#plan_options input[type=radio]').on('click', function() {
        RB.set_plan_options();
    });


    /*
    Announcements
    --------------
    */

    $('.js-prev-announcement-page').on('click', function() {
        var page = $('.js-announcement-steps li.active').data('page');
        $('.js-announcement-steps li[data-page='+parseInt(page-1)+'] a').tab('show');
    });
    $('.js-next-announcement-page').on('click', function() {
        var page = $('.js-announcement-steps li.active').data('page');
        $('.js-announcement-steps li[data-page='+parseInt(page+1)+'] a').tab('show');
    });


    /*
    Stripe
    */

    /*RB.add_stripe_button = function(stripe_key, card_input, card_errors, card_form, done_fn) {
        // Calling page must have <script src="https://js.stripe.com/v3/"></script>

        // Old method prior to Buy MOC button and multiple payment methods

        // Create a Stripe client
        var stripe = Stripe(stripe_key);

        // Create an instance of Elements
        var elements = stripe.elements();
        // https://stripe.com/docs/js/elements_object/create_element?type=card
        var style = {
            base: {
                fontSize: '16px',
                '::placeholder': {
                    color: '#aab7c4'
                }
            },
            invalid: {
                color: '#fa755a',
                iconColor: '#fa755a'
            }
        };

        // Create an instance of the card Element
        var card = elements.create('card', {style: style});
        card.mount(card_input);

        // Handle real-time validation errors from the card Element.
        card.addEventListener('change', function (event) {
            if (event.error) {
                $(card_errors).html(event.error.message);
            } else {
                $(card_errors).html('');
            }
        });

        // https://stripe.com/docs/payments/payment-intents/quickstart#manual-confirmation-flow
        RB.handle_stripe_action = function(data) {
            //console.log('handle_stripe_action');
            if (data.status == 'success' && data.requires_action) {
                // Requires further action eg SCA 3D Secure authentication
                stripe.handleCardAction(
                    data.payment_intent_client_secret
                ).then(function (result) {
                    //console.log(result);
                    if (result.error) {
                        // Show error in payment form
                        $(card_errors).html('<div class="alert alert-danger">'+result.error.message+'</div>');
                    } else {
                        // The card action has been handled
                        // The PaymentIntent can be confirmed again on the server
                        $(card_form).children('input[name=payment_intent_id]').val(result.paymentIntent.id);
                        RB.post_ajax_form({form: $(card_form)}, function (data) {
                            RB.handle_stripe_action(data);
                        }).done(function(data) {
                            //console.log('confirming');
                            RB.handle_stripe_action(data);
                        });
                    }
                });
            }
        };

        // Handle form submission
        var form = $(card_form);
        form.on('submit', function (event) {
            event.preventDefault();
            var btn = $(card_form).children('button');
            btn.spin();

            stripe.createPaymentMethod('card', card).then(function (result) {
                //console.log(result);
                if (result.error) {
                    $(card_errors).html(result.error.message);
                    btn.unspin();
                } else {
                    // Send the payment method to your server
                    //$(card_form).children('input[name=stripeToken]').val(result.token.id);
                    $(card_form).children('input[name=payment_method_id]').val(result.paymentMethod.id);
                    $(card_form).children('input[name=coupon]').val($('#moc_bi_cost_data').data('coupon'));
                    RB.post_ajax_form({form: $(card_form)}, function (data) {
                        btn.unspin();
                        if (done_fn) {
                            done_fn(data);
                        }
                        RB.handle_stripe_action(data);
                    });
                }
            });

            return false;
        });
    };*/

    RB.add_stripe_billing_button = function(stripe_key, card_input, card_errors, card_form, done_fn) {
        // Calling page must have <script src="https://js.stripe.com/v3/"></script>
        // old billing method.

        // Create a Stripe client
        var stripe = Stripe(stripe_key);

        // Create an instance of Elements
        var elements = stripe.elements();
        var style = {
            base: {
                fontSize: '18px',
                '::placeholder': {
                    color: '#aab7c4'
                }
            },
            invalid: {
                color: '#fa755a',
                iconColor: '#fa755a'
            }
        };

        // Create an instance of the card Element
        var card = elements.create('card', {style: style});
        card.mount(card_input);

        // Handle real-time validation errors from the card Element.
        card.addEventListener('change', function (event) {
            if (event.error) {
                $(card_errors).html(event.error.message);
            } else {
                $(card_errors).html('');
            }
        });

        // Handle form submission
        var form = $(card_form);
        form.on('submit', function (event) {
            event.preventDefault();
            var btn = $(card_form).children('button');
            btn.spin();

            stripe.createToken(card).then(function (result) {
                console.log(result);
                if (result.error) {
                    $(card_errors).html(result.error.message);
                    btn.unspin();
                } else {
                    // Send the token to your server
                    $(card_form).children('input[name=stripeToken]').val(result.token.id);
                    $(card_form).children('input[name=coupon]').val($('#moc_bi_cost_data').data('coupon'));
                    RB.post_ajax_form({form: $(card_form)}, function (data) {
                        btn.unspin();
                        if (done_fn) {
                            done_fn(data);
                        }
                    });
                }
            });

            return false;
        });
    };

    RB.add_stripe_payments = function(stripe_key, client_secret, designer_stripe_id, card_input, card_errors, card_form, return_url, done_fn) {
        // https://stripe.com/docs/payments/accept-a-payment?platform=web&ui=elements
        // Uses Stripe Payment Element to automatically show relevant payment methods to choose from
        // Calling page must have <script src="https://js.stripe.com/v3/"></script>

        /*var stripe;
        if (designer_stripe_id) {
            console.log(designer_stripe_id);
            stripe = Stripe(stripe_key, {stripeAccount: designer_stripe_id});   // direct charges, eg user buying MOC
        } else {
            stripe = Stripe(stripe_key);        // destination charges, eg paying to RB
        }*/
        let stripe = Stripe(stripe_key);        // destination charges, eg paying to RB

        var is_dark = $('body').hasClass('dark-mode');
        var appearance = {};
        if (is_dark) {
            appearance = {
                theme: 'night',
            };
        }
        let options = {clientSecret: client_secret, appearance};
        if (designer_stripe_id) {
            // Only needed for Co-badged cards compliance:
            // https://docs.stripe.com/co-badged-cards-compliance?type=web-elements&ui=payment-element
            options['onBehalfOf'] = designer_stripe_id
        }
        let elements = stripe.elements(options);
        let card = elements.create('payment');
        /*card.on("ready", function() {
            // https://stackoverflow.com/questions/71324848/slow-loading-time-of-stripe-payment-element
            $('#payment_options_spin').unspin();
        })*/
        card.mount(card_input);

        const form = document.getElementById(card_form);
        if (!form) {
            console.error('Could not find Stripe form');
        }
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            $('#submit_stripe').spin();

            // https://stripe.com/docs/js/payment_intents/confirm_payment#confirm_payment_intent-options-redirect
            stripe.confirmPayment({
                elements,
                confirmParams: {
                  return_url: return_url,
                },
                redirect: 'if_required', // https://stripe.com/docs/js/payment_intents/confirm_payment#confirm_payment_intent-options-redirect
            }).then(function(result) {
                // If the payment method requires a redirect (eg iDEAL), this bit never runs.
                console.log(result);
                if (result.error) {
                    $(card_errors).html('<div class="alert alert-danger">'+result.error.message+'</div>');
                } else {
                    const message = document.querySelector(card_errors);
                    // https://stripe.com/docs/payments/payment-methods#payment-notification
                    switch (result.paymentIntent.status) {
                        case 'succeeded':
                            message.innerText = 'Success! Payment received.';
                            done_fn(result);
                            $('.modal').modal('hide');
                            break;

                        case 'processing':
                            message.innerText = "Payment processing. We'll update you when payment is received.";
                            break;

                        case 'requires_payment_method':
                            message.innerText = 'Payment failed. Please try another payment method.';
                            break;

                        default:
                            message.innerText = 'Something went wrong.';
                            break;
                    }
                }
                $('#submit_stripe').unspin();
            });

        });

    };


    /*
    Top Bar
    --------
    */

    RB.load_topbar = function(username) {
        // Give other ajax calls a bit more priority by waiting a tad
        setTimeout(function() {
            RB.get_ajax({elem: $('#topBarDetails'), url: '/users/'+username+'/topbar/'});
        }, 100);
    };

    /*
    User Cards
    ----------
    */

    var card_timer, leave_card_timer;
    selector_body.on('mouseenter', '.js-hover-card', function(e) {
        // hover over link, start a timer to display card
        var url = $(this).data('hover');
        // Scroll positions, not pixel positions
        var left = e.pageX;
        var top = e.pageY;
        // Start tracking mouse movement and save the cursor position so we know it when it's time to show the popup
        $(this).off('mousemove').on('mousemove', function(e) {
            left = e.pageX+10;
            top = e.pageY+10;
        });
        card_timer = setTimeout(function () {
            RB.get_ajax({'url': url, 'elem': $('#hover_card')}, function(data) {
                // #hover_card width and height not accurate until shown? hardcoding max observed sizes.
                var card_width = 450;
                var card_height = 500;
                //console.log('window: ' + window.innerWidth + ' , ' + window.innerHeight);
                //console.log('cursor: ' + e.clientX + ' , ' + e.clientY);
                //console.log('scroll: ' + left + ' , ' + top);
                //console.log($('#hover_card').width() + ' x ' + $('#hover_card').height());
                if (left > window.innerWidth - card_width) { left = window.innerWidth - card_width; }  // so it doesn't fall off right edge
                if (window.innerHeight - e.clientY < card_height) { top = top - (card_height-(window.innerHeight-e.clientY)); }  // so it doesn't fall off bottom
                console.log('Showing card at ' + (left-window.scrollX) + ' ' + (top-window.scrollY));
                $('#hover_card').css({'left': (left-window.scrollX) +'px', 'top': (top-window.scrollY) +'px', 'display': 'block'});
            });
        }, 500);
        clearTimeout(leave_card_timer);
    });
    selector_body.on('mouseleave', '.js-hover-card', function() {
        // stop hovering over link, cancel timer to display card, start timer to hide card
        clearTimeout(card_timer);
        leave_card_timer = setTimeout(function () {
            $('#hover_card').css({'display': 'none'});
        }, 500);
    });
    selector_body.on('mouseenter', '#hover_card', function() {
        // hover over card, cancel timer to hide card
        clearTimeout(leave_card_timer);
    });
    selector_body.on('mouseleave', '#hover_card', function() {
        // stop hovering over card, reinstate timer to hide card
        leave_card_timer = setTimeout(function () {
            $('#hover_card').css({'display': 'none'});
        }, 500);
    });

    /*
    Undo
    ----
    */

    selector_body.on('click', '.js-undo-change', function() {
        var btn = $(this);
        var context = {elem: btn, url: btn.data('url')};
        RB.post_ajax(context, function(data) {
          if (data.status == 'success') {
            btn.parents('tr').remove();
          }
        });
    });

    /*
    Checkbox Mode
    -------------
    */

    RB.remove_part_checkboxes = function(items) {
        $(items).find('.part-bulk-checkbox').remove();
        $(items).removeClass('dark-overlay');
    };
    RB.add_part_checkboxes = function(items) {
        RB.remove_part_checkboxes($(items));
        $(items).each(function() {
            $(this).append('<div class="part-bulk-checkbox"><label class="control-label checkbox checkbox-lg"><input type="checkbox" class="js-checkbox-item"><i></i></label></div>');
        });
    };

    selector_body.on('click', '.js-checklist-mode', function() {
        if ($(this).hasClass('active')) RB.add_part_checkboxes('.js-part>div');
        else RB.remove_part_checkboxes($('.js-part>div'));
    });
    selector_body.on('click', '.js-checkbox-item', function(e) {
        if ($(this).is(':checked')) $(this).parents('.inv_img').addClass('dark-overlay');
        else $(this).parents('.inv_img').removeClass('dark-overlay');
    });

    RB.toggle_dark_mode = function() {
        var is_dark = $('body').hasClass('dark-mode');
        console.log('toggle_dark_mode ' + is_dark);
        // Find all Highcharts
        var bg_color = '#fafafa';
        var text_color = '#333';
        if (is_dark) { bg_color = '#333'; text_color = '#ccc'; }
        $("body").find('[data-highcharts-chart]').each(function() {
            var chart = $(this).highcharts();
            chart.update({
                chart: {backgroundColor: bg_color},
                legend: {itemStyle: {color: text_color}},
                title: {style: {color: text_color}},
                xAxis: {labels: {style: {color: text_color}}},
            });
            for (var i in chart.yAxis) {
                chart.yAxis[i].update({labels: {style: {color: text_color}}});
            }
            // Re-color plotlines = nope, too hard
            /*var plotLines = [];
            console.log(chart.xAxis[0].plotLinesAndBands);
            for (var i in chart.xAxis[0].plotLinesAndBands) {
                let pl = chart.xAxis[0].plotLinesAndBands[i];
                pl.color = text_color;
                console.log(pl);
                plotLines.push(pl);
                //plotLines.push({color: text_color, label: {style: {color: text_color}}})
            }
            console.log(plotLines);
            chart.xAxis[0].update({plotLines: plotLines});*/
        });
        // Find all bbcode text boxes
        $(".sceditor-container").each(function(index) {
            var body = $(this).children('iframe').contents().find('body');
            if (is_dark) {
                $(body).addClass('dark-mode');
            } else {
                $(body).removeClass('dark-mode');
            }
        });
    };

    /*
    Image Watermarking
    ------------------
    */

    RB.show_watermark_preview = function() {
        var val = $('select[name=img_wm_preset_default]').val();
        if (val == 0) {
            $('#wm_img_preview_light').hide();
            $('#wm_img_preview_dark').hide();
            $('#wm_warning_msg').hide();
        } else {
            $('#wm_img_preview_light').attr('src', '/static/img/wm/mocs-light-' + val + '.png?v6');
            $('#wm_img_preview_light').parent('a.lightbox').attr('href', '/static/img/wm/mocs-light-' + val + '.png?v7');
            $('#wm_img_preview_light').show();
            $('#wm_img_preview_dark').attr('src', '/static/img/wm/mocs-dark-' + val + '.png?v6');
            $('#wm_img_preview_dark').parent('a.lightbox').attr('href', '/static/img/wm/mocs-dark-' + val + '.png?v7');
            $('#wm_img_preview_dark').show();
            $('#wm_warning_msg').show();
        }
    }
    selector_body.on('change', 'select[name=img_wm_preset_default]', function() {
        RB.show_watermark_preview();
    });
    RB.show_watermark_preview();


    RB.initDateRangePicker = function() {
        // https://www.daterangepicker.com/
        // Requires:
        //   <script type="text/javascript" src="{% static 'smarty/plugins/bootstrap.daterangepicker/moment.min.js' %}"></script>
        //   <script type="text/javascript" src="{% static 'smarty/plugins/bootstrap.daterangepicker/daterangepicker.min.js' %}"></script>
        //   <link rel="stylesheet" type="text/css" href="{% static 'smarty/plugins/bootstrap.daterangepicker/daterangepicker.min.css' %}" />

        var _container_2 = jQuery('.rangepicker');

        if (_container_2.length > 0) {

            _container_2.each(function () {

                var _t = jQuery(this),
                    _format = _t.attr('data-format').toUpperCase() || 'YYYY-MM-DD';

                _t.daterangepicker(
                    {
                        locale: {
                            "format": _format,
                        },
                        startDate: _t.attr('data-from'),
                        endDate: _t.attr('data-to'),
                        alwaysShowCalendars: true,
                        autoApply: true,
                        autoUpdateInput: true,
                        showCustomRangeLabel: false,
                        ranges: {
                            'Today': [moment(), moment()],
                            'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
                            'Last 7 Days': [moment().subtract(6, 'days'), moment()],
                            'Last 30 Days': [moment().subtract(29, 'days'), moment()],
                            'Last 90 Days': [moment().subtract(89, 'days'), moment()],
                            'This Month': [moment().startOf('month'), moment()],
                            'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
                            'Last 13 Months': [moment().subtract(12, 'month').startOf('month'), moment()],
                            'This Year': [moment().startOf('year'), moment()],
                            'Last Year': [moment().subtract(1, 'year').startOf('year'), moment().subtract(1, 'year').endOf('year')],
                            //'Maximum': ['2000-01-01', moment()],
                        }
                    });

            });
        }
    }

});

// https://github.com/js-cookie/js-cookie
!function (e) {
    var n;
    if ("function" == typeof define && define.amd && (define(e), n = !0), "object" == typeof exports && (module.exports = e(), n = !0), !n) {
        var t = window.Cookies, o = window.Cookies = e();
        o.noConflict = function () {
            return window.Cookies = t, o
        }
    }
}(function () {
    function e() {
        for (var e = 0, n = {}; e < arguments.length; e++) {
            var t = arguments[e];
            for (var o in t) n[o] = t[o]
        }
        return n
    }

    function n(e){return e.replace(/(%[0-9A-Z]{2})+/g,decodeURIComponent)}return function t(o){function r(){}function i(n,t,i){if("undefined"!=typeof document){"number"==typeof(i=e({path:"/"},r.defaults,i)).expires&&(i.expires=new Date(1*new Date+864e5*i.expires)),i.expires=i.expires?i.expires.toUTCString():"";try{var c=JSON.stringify(t);/^[\{\[]/.test(c)&&(t=c)}catch(e){}t=o.write?o.write(t,n):encodeURIComponent(String(t)).replace(/%(23|24|26|2B|3A|3C|3E|3D|2F|3F|40|5B|5D|5E|60|7B|7D|7C)/g,decodeURIComponent),n=encodeURIComponent(String(n)).replace(/%(23|24|26|2B|5E|60|7C)/g,decodeURIComponent).replace(/[\(\)]/g,escape);var f="";for(var u in i)i[u]&&(f+="; "+u,!0!==i[u]&&(f+="="+i[u].split(";")[0]));return document.cookie=n+"="+t+f}}function c(e,t){if("undefined"!=typeof document){for(var r={},i=document.cookie?document.cookie.split("; "):[],c=0;c<i.length;c++){var f=i[c].split("="),u=f.slice(1).join("=");t||'"'!==u.charAt(0)||(u=u.slice(1,-1));try{var a=n(f[0]);if(u=(o.read||o)(u,a)||n(u),t)try{u=JSON.parse(u)}catch(e){}if(r[a]=u,e===a)break}catch(e){}}return e?r[e]:r}}return r.set=i,r.get=function(e){return c(e,!1)},r.getJSON=function(e){return c(e,!0)},r.remove=function(n,t){i(n,"",e(t,{expires:-1}))},r.defaults={},r.withConverter=t,r}(function(){})});
