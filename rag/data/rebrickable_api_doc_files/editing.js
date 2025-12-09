var RB = RB || {};

/*
Editing inventories/lists (user must be logged in to include this file)
-----------------------------------------------------------------------
*/

$(function() {

    var selector_body = $('body');

    /*
    User Set Lists
    --------------
    */

    // Edit List Set - load modal details
    selector_body.on('click', ".js-edit-list-set", function(ev) {
        var url = $(this).data("url") + '?page_querystring='+encodeURIComponent(location.search);
        RB.load_modal({modal: '#page_modal', modaltitle: 'Edit Set in Set List', elem: $('#page_modal_body'), url: url}, function() {
            RB.setBBCode();
        });
    });

    // Edit User Set - delete set
    selector_body.on('click', '#delete_user_set, #delete_set_note', function() {
        RB.post_ajax({elem: $(this), url: $(this).parents('form').data('deleteurl')/*, data: $('#edit_user_set_form').serialize()*/}, function(data) {
            //if (data.status == 'success') location.reload();
            $('.modal').modal('hide');
        });
    });

    // Add Set to Ignored Sets list
    selector_body.on('click', '.js-ignore-set', function() {
        var btn = $(this);
        RB.post_ajax({elem: $(this), url: $(this).data('url'), data: 'set_id='+$(this).data('set_id')}, function(data) {
            if (data.status == 'success') {
                btn.parents('.js-build-search-result').hide();
            }
        });
    });

    // Delete Set from Ignored Sets List
    selector_body.on('click', '.js-delete-ignored-set', function() {
        var btn = $(this);
        RB.post_ajax({elem: $(this), url: $(this).data('url')}, function(data) {
            if (data.status == 'success') {
                //location.reload();
                btn.parents('.js-set').remove();
            }
        });
    });

    /*
    Lists
    ---------------
    */

    // Add Parts to List - Build Set
    selector_body.on('click', '.js-add_parts_to_list_submit', function() {
        var parts = RB.getPartsList($(this).data('parts_selector'));
        $(this).parents('form').children('input[name=action]').val($(this).data('action'));
        $(this).parents('form').children('input[name=parts]').val(JSON.stringify(parts));
        $(this).parents('form').data('elem', '#' + $(this).attr('id')); // so appropriate button spins on submit
        console.log($(this).parents('form').data('elem'));
    });


    /*
    Importing
    -------------
     */

    // https://github.com/blueimp/jQuery-File-Upload/wiki/Drop-zone-effects
    // Hover drop zone effects
    selector_body.on('dragover', function (e) {
        var dropZone = $('.dropzone'),
            foundDropzone,
            timeout = window.dropZoneTimeout;
        if (!timeout) {
            dropZone.addClass('in');
        } else {
            clearTimeout(timeout);
        }
        var found = false,
            node = e.target;
        do {
            if ($(node).hasClass('dropzone')) {
                found = true;
                foundDropzone = $(node);
                break;
            }
            node = node.parentNode;
        } while (node != null);

        dropZone.removeClass('in hover');

        if (found) {
            foundDropzone.addClass('hover');
        }

        window.dropZoneTimeout = setTimeout(function () {
            window.dropZoneTimeout = null;
            dropZone.removeClass('in hover');
        }, 100);
    });

    // Import Parts from file/url/dropzone
    if ($.fn.fileupload) {
        $('#import_parts_file').fileupload({
            dropZone: $('.dropzone'),
            replaceFileInput: false,
            add: function (e, data) {
                // Selected file, or dropped into dropzone
                $("#append_parts").off('click').on('click', function () {
                    $('#import_parts_form input[name=action]').val('A');
                    data.submit();
                });
                $("#replace_parts").off('click').on('click', function () {
                    $('#import_parts_form input[name=action]').val('R');
                    data.submit();
                });
                $("#subtract_parts").off('click').on('click', function () {
                    $('#import_parts_form input[name=action]').val('S');
                    data.submit();
                });
            },
            start: function (e, data) {
                // File upload starting
                $('#import_parts_msg').html(RB.spinner);
            },
            done: function (e, data) {
                // File uploaded and processed
                console.log(data);
                if (data.result.status == 'success') {
                    $('#import_parts_msg').html(data.result.html);  // Display loading messages/errors
                    //$('#inventory').html(data.result.inv_html);  // Display new parts
                    RB.render_elements(data.result.renders);
                    //$('#parts_count').html(data.result.num_parts);  // Update part count in tab
                    //RB.setInventoryView();
                    $('#pending_preview').html(data.result.preview);
                    RB.setPartTilesView();
                } else {
                    $('#import_parts_msg').html(data.result.msg);
                    RB.show_error(data.result.msg);
                }
                RB.render_elements(data.renders);
            },
            fail: function (e, data) {
                // Ajax request failed
                $('#import_parts_msg').html('');
                RB.show_error("ERROR " + data.jqXHR.status + ": " + data.errorThrown);
            },
            drop: function (e, data) {
                // Dropped file into dropzone
                $('#import_parts_drop_files_msg').html('Drag and drop your inventory file here<br>File: ' + data.files[0].name);
            }
        });
    }

    // Clicked Append Parts (Submit MOC/Set, Lists) - eg w URL
    $("#append_parts").off('click').on('click',function () {
        $('#import_parts_form input[name=action]').val('A');
        RB.post_ajax_form({elem: $('#import_parts_msg'), form: $('#import_parts_form')}, done_fn=function(data) {
            $('#inventory').html(data.inv_html);
            RB.setInventoryView();
            RB.setPartTilesView();
            if (data.preview) {
                // USed for submit Set/MOC
                $('#pending_preview').html(data.preview);
            }
        });
    });

    // Clicked Replace Parts (Submit MOC/Set, Lists) - eg w URL
    $("#replace_parts").off('click').on('click',function () {
        $('#import_parts_form input[name=action]').val('R');
        RB.post_ajax_form({elem: $('#import_parts_msg'), form: $('#import_parts_form')}, done_fn=function(data) {
            $('#inventory').html(data.inv_html);
            RB.setInventoryView();
            RB.setPartTilesView();
            if (data.preview) {
                // USed for submit Set/MOC
                $('#pending_preview').html(data.preview);
            }
        });
    });

    // Clicked Subtract Parts (Submit MOC/Set, Lists) - eg w URL
    $("#subtract_parts").off('click').on('click',function () {
        $('#import_parts_form input[name=action]').val('S');
        RB.post_ajax_form({elem: $('#import_parts_msg'), form: $('#import_parts_form')}, done_fn=function(data) {
            $('#inventory').html(data.inv_html);
            RB.setInventoryView();
            RB.setPartTilesView();
            if (data.preview) {
                // USed for submit Set/MOC
                $('#pending_preview').html(data.preview);
            }
        });
    });

    // Clicked Delete Parts (Submit MOC, Lists)
    $('#delete_parts').on('click', function() {
        RB.post_ajax({elem: $(this), url: $(this).data('url')}, done_fn=function(data) {
            $('#inventory').html(data.inv_html);
            $('#import_parts_msg').html('');
        });
    });

    // Clicked Delete Sets (Lists)
    $('#delete_sets').on('click', function() {
        RB.post_ajax({elem: $(this), url: $(this).data('url')}, done_fn=function(data) {
            $('#inventory_sets').html(data.inv_html);
            $('#import_sets_msg').html('');
        });
    });

    /*
    Import BrickOwl/BrickLink + Import/Export Brickset
    --------------------------------------------------
    */

    // Clicked the 'Import Brickset Sets' button in Brickset modal (Append to Set List)
    selector_body.on('click', '#import_brickset_sets', function() {
        RB.post_ajax_form({
            form: $('#import_brickset_sets_form'),
            url: $('#import_sets_form').attr('action'), // From the import form's upload_url
            elem: $(this),
            html: $('#brickset_sets_div')
        });
        return false; // don't re-submit form
    });

    // Clicked the 'Send Sets to Brickset' button in Brickset modal
    selector_body.on('click', '#export_brickset_sets', function() {
        RB.post_ajax_form({
            form: $('#export_brickset_sets_form'),
            url: $('#export_brickset_sets_form').attr('action'),
            elem: $(this),
            html: $('#brickset_sets_div')
        });
        return false; // don't re-submit form
    });

    // Clicked 'Get Orders' on Import from BrickOwl modal
    selector_body.on('submit', '#brickowl_key_orders_form', function() {
        RB.load_modal({
            modal: '#import_brickowl_order_modal',
            elem: $('#brickowl_orders_div'),
            url: $(this).attr('action'),
            data: $(this).serialize()
        }, function(data) {
            if (data.status == 'success') {
                RB.initDataTables('#brickowl_orders_table');
            } else {
                $('#brickowl_orders_div').html(data.msg);
            }
        });
        return false; // don't submit form
    });

    // Clicked 'Append Parts' on a BrickOwl Order
    selector_body.on('click', '.js-import-brickowl-parts-order', function() {
        if ($('#import_parts_form').length) {
            $('input[name=import_url]').val($(this).data('url')); // Highjack Import from URL
            $('#import_parts_form input[name=action]').val('A');
            RB.post_ajax_form({elem: $(this), form: $('#import_parts_form')}, function(data) {
                $('#import_parts_msg').html(data.html);  // Display loading messages/errors
                $('#inventory').html(data.inv_html);  // Display new parts
                RB.setPartTilesView();
                //$('#parts_count').html(data.num_parts);  // Update part count in tab
            });
        } else {
            RB.show_error('Cannot import parts on this page');
        }
        return false; // don't submit #brickowl_key_form
    });

    // Clicked 'Append Sets' on a BrickOwl Order
    selector_body.on('click', '.js-import-brickowl-sets-order', function() {
        // Make sure there is actually an import sets capability on the page
        // eg Wishlists can do either, but Part Lists can't
        if ($('#import_sets_form').length) {
            $('input[name=import_url]').val($(this).data('url')); // Highjack Import from URL
            $('#import_sets_form input[name=action]').val('A');
            RB.post_ajax_form({elem: $(this), form: $('#import_sets_form')}, function(data) {
                $('#import_sets_msg').html(data.html);  // Display loading messages/errors
                $('#inventory').html(data.inv_html);  // Display new sets
                $('#sets_count').html(data.num_sets);  // Update part count in tab
            });
        } else {
            RB.show_error('Cannot import sets on this page');
        }
        return false; // don't submit #brickowl_key_form
    });

    // Import BrickLink Order (API)
    $('#import_bricklink_parts_order, #import_bricklink_sets_order').on('click', function() {
        bl_handler = new BRICKLINK.apps.flow({
            callbackFunction : function () {
                bl_handler.closeFlow();
                location.reload();
            },
            appKey : "MzZ8d3d3LnJlYnJpY2thYmxlLmNvbQ"
        });
        var user_token = $(this).data('user_token');
        var user_id = $(this).data('user_id');
        var url = $(this).data('url');
        // To debug the response, breakpoint on bl_rebrickable.js line 356
        try {
            bl_handler.startFlow("https://www.bricklink.com/v2/affiliate/orders.page", {
                /*url: 'http://127.0.0.1:8000' + url + 'bricklink/',*/
                /*url: 'https://dev.rebrickable.com' + url + 'bricklink/',*/
                url: 'https://rebrickable.com' + url + 'bricklink/',
                customData: { user_token: user_token, user_id: user_id }
            });
        } catch(err) {
            console.log(err);
            show_js_error('There was a problem opening the BrickLink window, probably because the popup was blocked by your browser. Please enable popups for this site and reload the page.');
        }
        return false;
    });

    // Import Sets
    if ($.fn.fileupload) {
        $('#import_sets_file').fileupload({
            dropZone: $('#import_sets_form'),
            replaceFileInput: false,
            add: function (e, data) {
                // Selected file, or dropped into dropzone
                $("#append_sets").off('click').on('click', function () {
                    $('#import_sets_form input[name=action]').val('A');
                    data.submit();
                });
                $("#replace_sets").off('click').on('click', function () {
                    $('#import_sets_form input[name=action]').val('R');
                    data.submit();
                });
                $("#subtract_sets").off('click').on('click', function () {
                    $('#import_sets_form input[name=action]').val('S');
                    data.submit();
                });
            },
            start: function (e, data) {
                // File upload starting
                $('#import_sets_msg').html(RB.spinner);
            },
            done: function (e, data) {
                // File uploaded and processed
                console.log(data);
                if (data.result.status == 'success') {
                    $('#import_sets_msg').html(data.result.html);  // Display loading messages/errors
                    $('#inventory_sets').html(data.result.inv_html);  // Display new sets
                    $('#sets_count').html(data.result.num_sets);  // Update set count in tab
                    RB.setInventoryView();
                    RB.setSetTilesView();
                    RB.initLazyLoad();
                } else {
                    $('#import_sets_msg').html(data.result.msg);
                    RB.show_error(data.result.msg);
                }
            },
            fail: function (e, data) {
                // Ajax request failed
                console.log(data);
                $('#import_sets_msg').html('');
                RB.show_error("ERROR " + data.jqXHR.status + ": " + data.errorThrown);
            },
            drop: function (e, data) {
                // Dropped file into dropzone
                $('#import_sets_drop_files_msg').html('Drag and drop your inventory file here<br>File: ' + data.files[0].name);
            },
        });
    }

    /*
    Part Popups
    ------------
    */

    // Edit Part - delete part (user/inv/wishlist)
    // TODO refactor popups to use .js-delete-submit-form too
    selector_body.on('click', '#part_popup_modal #delete_part, #part_popup_modal #delete_inv_part, #part_popup_modal #delete_part_note, #delete_inv_set, .js-delete-submit-form', function() {
        //RB.post_ajax({elem: $(this), url: $('#edit_inv_part_form').data('deleteurl'), data: ''}, function(data) {
        RB.post_ajax({elem: $(this), url: $(this).parents('form').data('deleteurl')}, function(data) {
            if (data.status == 'success') {
                $('.modal').modal('hide');
                if (data.reloadonsuccess != 0) location.reload();
            }
        });
    });

    // Clicked Is Spare checkbox on Part Popup's Add Part tab
    selector_body.on('click', '#part_popup_div #tab_add input[name=is_spare]', function() {
        if ($(this).is(":checked")) {
            $(this).parents('form').find('input[name=quantity]').val(1);
            if ($('#page_data').data('set_num')) {
                // Set some default
                $(this).parents('form').find('input[name=set_num]').val($('#page_data').data('set_num'));
                // add option for inventory and then set it
                $(this).parents('form').find('select[name=inventory]').append($('<option>', {value: $('#page_data').data('inv_id'), text: $('#page_data').data('inv')}));
                $(this).parents('form').find('select[name=inventory]').val($('#page_data').data('inv_id'));
                $(this).parents('form').find('input[value="set_inv"]').prop('checked', 'checked');
            }
        }
    });

    // Clicked Keep Open on Part Popup/Add Part modals
    selector_body.on('click', '.js-keep-open', function() {
        if ($(this).is(":checked")) {
            $(this).parents('form').data('donthidemodalonsuccess', '1');
        } else {
            $(this).parents('form').data('donthidemodalonsuccess', '0');
        }
    });

    // Clicked a suggested part to fill in Edit Part fields
    selector_body.on('click', '.js-suggested-part', function() {
        $('#id_part').val($(this).data('part_num'));
        $('#edit_inv_part_form select[name=color]').val($(this).data('color_id'));
        return false;
    });

    /*
    Bulk Editing
    ------------
    */

    // Turn on Bulk Editing
    RB.enable_bulk_editing = function(btn) {
        var container = $(btn.data('bulk_container'));
        btn.data('bulk_enabled', true);
        btn.removeClass('active').addClass('active');
        container.find('.inv_img').removeClass('border-green'); // removes existing highlighting, but meh
        container.find('.inv_img').removeClass('border-orange'); // removes existing highlighting, but meh
        container.find('.inv_img').removeClass('border-red'); // removes existing highlighting, but meh
        container.find('.js-bulk-edit-controls').show();
        container.find('.js-bulk-edit-controls').first().data('bulk_container', container);
        container.find('.js-bulk-edit-controls').first().data('bulk_item_type', btn.data('bulk_item_type'));
        container.find('.js-part-price').hide(); // hide part prices to make more room
        container.find('.js-part-user-note').hide(); // hide user notes to make more room
        //container.find('.js-set-actions').hide(); // hide set action bar to make more room
        var items = container.find(btn.data('bulk_items'));
        container.find('.part-bulk-checkbox').remove();
        items.each(function() {
            $(this).append('<div class="part-bulk-checkbox"><label class="control-label checkbox checkbox-lg"><input type="checkbox" class="js-bulk-edit-item"><i></i></label></div>');
        });
    };

    // Toggle Bulk Editing
    RB.toggle_bulk_editing = function(btn) {
        var enabled = btn.data('bulk_enabled');
        var container = $(btn.data('bulk_container'));
        if (enabled) {
            btn.data('bulk_enabled', false);
            btn.removeClass('active');
            container.find('.js-bulk-edit-select-all').prop('checked', false);
            container.find('.js-bulk-edit-controls').hide();
            container.find('.part-bulk-checkbox').remove();
            container.find('.inv_img').removeClass('border-green');
            container.find('.set-tn').removeClass('border-green');
            container.find('.js-set-actions').show();
            container.find('.js-part-user-note').show();
            RB.setPartPricesView(); // reset part prices
        } else {
            RB.enable_bulk_editing(btn);
        }
    };

    // Toggle Bulk Editing
    selector_body.on('click', '.js-bulk-edit', function() {
        RB.toggle_bulk_editing($(this));
    });

    RB.update_bulk_selected_parts = function(container) {
        $('.js-bulk-edit-num-parts-selected').html( $('.part-bulk-checkbox input:checked').length );
    };

    // Select all bulk items
    selector_body.on('click', '.js-bulk-edit-select-all', function() {
        var btn = $(this);
        var container = btn.parents('.js-bulk-edit-controls').first().data('bulk_container');
        container.find('.part-bulk-checkbox input').each(function() {
            if (btn.is(':checked')) {
                $(this).parents('.inv_img').removeClass('border-green').addClass('border-green');
                $(this).parents('.set-tn').removeClass('border-green').addClass('border-green');
                $(this).prop('checked', true);
            } else {
                $(this).parents('.inv_img').removeClass('border-green');
                $(this).parents('.set-tn').removeClass('border-green');
                $(this).prop('checked', false);
            }
        });
        RB.update_bulk_selected_parts(container);
    });

    // Select bulk edit checkbox on part
    selector_body.on('click', '.js-bulk-edit-item', function(e) {
        $(this).parents('.inv_img').toggleClass('border-green');
        $(this).parents('.set-tn').toggleClass('border-green');
        var container = $(this).parents('.js-bulk-edit-controls').first().data('bulk_container');
        RB.update_bulk_selected_parts(container);
    });

    // Bulk Edit action
    selector_body.on('click', '.js-bulk-edit-action', function() {
        var items = [];
        var item_type;
        var data;
        var container = $($(this).parents('.js-bulk-edit-controls').first().data('bulk_container'));
        var bulk_item_type = $(this).parents('.js-bulk-edit-controls').first().data('bulk_item_type');
        // Get the list of selected items
        if (bulk_item_type == 'part') {
            container.find('.part-bulk-checkbox input:checked').each(function () {
                items.push($(this).parents('.js-part').find('.js-part-data').data('list_part_id'));
                item_type = $(this).parents('.js-part').find('.js-part-data').data('list_part_type');
            });
            data = JSON.stringify({'parts': JSON.stringify(items), 'part_type': item_type});
        } else if (bulk_item_type == 'set') {
            container.find('.part-bulk-checkbox input:checked').each(function () {
                items.push($(this).parents('.set-tn').data('list_set_id'));
                item_type = $(this).parents('.set-tn').data('list_set_type');
            });
            data = JSON.stringify({'sets': JSON.stringify(items), 'set_type': item_type});
        }
        $('#page_modal').modal();
        $('#page_modal').find('.modal-title').html('Bulk Edit');
        var url = $(this).data('url') + '&page_querystring='+encodeURIComponent(location.search);
        RB.post_ajax({'url': url, 'elem': $('#page_modal_body'), 'data': data});
    });

    // Bulk Edit delete
    selector_body.on('click', '.js-bulk-edit-delete', function() {
        var items = [];
        var item_type;
        var item_data;
        var container = $(this).parents('.js-bulk-edit-controls').first().data('bulk_container');
        var bulk_item_type = $(this).parents('.js-bulk-edit-controls').first().data('bulk_item_type');
        // Get the list of selected parts
        if (bulk_item_type == 'part') {
            container.find('.part-bulk-checkbox input:checked').each(function () {
                items.push($(this).parents('.js-part').find('.js-part-data').data('list_part_id'));
                item_type = $(this).parents('.js-part').find('.js-part-data').data('list_part_type');
            });
            item_data = JSON.stringify({'parts': JSON.stringify(items), 'part_type': item_type});
        } else if (bulk_item_type == 'set') {
            container.find('.part-bulk-checkbox input:checked').each(function () {
                items.push($(this).parents('.set-tn').data('list_set_id'));
                item_type = $(this).parents('.set-tn').data('list_set_type');
            });
            item_data = JSON.stringify({'sets': JSON.stringify(items), 'set_type': item_type});
        }
        var url = $(this).data('url') + '?page_querystring='+encodeURIComponent(location.search);

        RB.confirm_delete('Delete all selected ' + bulk_item_type + 's?', 'Delete '+bulk_item_type+'s', function(data) {
            RB.post_ajax({'url': url, 'elem': $('.js-bulk-edit-delete'), 'data': item_data}, function() {
                RB.enable_bulk_editing($(".js-bulk-edit[data-bulk_item_type='"+bulk_item_type+"']"));
            });
        });

    });

    /* Submit bulk action form */
    selector_body.on('submit', '#js-bulk-edit-parts-form, #js-bulk-edit-part-lists-form', function() {
        var context = {form: $(this)};
        RB.post_ajax_form(context, function() {
            RB.enable_bulk_editing($(".js-bulk-edit[data-bulk_item_type='part']"));
        });
        return false;
    });
    selector_body.on('submit', '#js-bulk-edit-sets-form, #js-bulk-edit-set-lists-form', function() {
        var context = {form: $(this)};
        RB.post_ajax_form(context, function() {
            RB.enable_bulk_editing($(".js-bulk-edit[data-bulk_item_type='set']"));
        });
        return false;
    });

    /*
    Part Photos
    -----------
    */

    // Setup Croppie client-side image cropping
    RB.init_croppie = function(container, input) {
		var $uploadCrop;
		//console.log($(container));

		var dims = {width: 500, height: 500};
		if ($(container).data('viewwidth')) {
		    // Can overwrite viewport dimensions for different aspect ratios in sets vs parts
		    dims.width = $(container).data('viewwidth');
		    dims.height = $(container).data('viewheight');
        }
		var boundary_dims = {width: dims.width+50, height: dims.height+50};

		$uploadCrop = $(container).croppie({
			viewport: dims,
			boundary: boundary_dims,
			enableExif: true,
            url: '/static/img/nil.png',
            enforceBoundary: false,
            minZoom: 0.01,
            maxZoom: 5,
		});

		$(input).on('change', function () { readFile(this); });

		function readFile(input) {
 			if (input.files && input.files[0]) {
 			    // NOTE: this is not supported on IE <= 9
	            var reader = new FileReader();

	            reader.onload = function (e) {
	            	$uploadCrop.croppie('bind', {
	            		url: e.target.result
	            	});
	            	$(container).addClass('ready');
	            };

	            reader.readAsDataURL(input.files[0]);

	            // Create extra hidden input to let server know an image was actually loaded to help distinguish
                // against the data for the default image.
                var new_input = $('<input type="hidden" name="image_loaded" value="1">');
                new_input.appendTo(input);
	        }
	        else {
		        console.log("Sorry - you're browser doesn't support the FileReader API");
		    }
		}

        return $uploadCrop;
	};

    // Submit Part/Set Photo - modal loaded
    $('.js-submit_photo_load_modal').on('click', function() {
        // Need to use the return function so dont use js-load-modal class.
        RB.load_modal({
            modal: '#page_modal',
            modaltitle: $(this).data('modaltitle'),
            elem: $('#page_modal_body'),
            url: $(this).data('url')
        }, function(data) {
            var container = '#upload_photo_croppie';
            var uploadCrop = RB.init_croppie(container, '#upload_photo_input');

            var elem = '#submit_part_photo';
            var orig_html = $(elem).html();

            var dims = {width: 500, height: 500};
            if ($(container).data('savewidth')) {
                // Can save file in different dimensions to visible viewport
                dims.width = $(container).data('savewidth');
                dims.height = $(container).data('saveheight');
            }

            $(elem).off('click').on('click',function () {
                uploadCrop.croppie('result', {
                    type: 'canvas',
                    //size: 'viewport',
                    size: dims,
                    format: 'jpeg',
                    backgroundColor:'white' /* only used when enforceBoundary is false */
                }).then(function (base64Image) {
                    base64Image = base64Image.replace("data:image/jpeg;base64,", "");
                    //console.log(base64Image);
                    RB.post_ajax({url: $('#upload_part_photo_form').attr('action'),
                        data: $('#upload_part_photo_form').serialize()+'&file='+encodeURIComponent(base64Image),
                        elem: $(elem)}, function(data) {
                        if (data.status == 'success') {
                            $('#submit_msg').show();
                        }
                    });
                });
            });

        });
        return false;
    });

    /*
    Stores
    -------
    */

    selector_body.on('click', '.js-user-store-fav', function() {
        var row = $($(this).data('row_id'));
        RB.post_ajax({elem: $(this), url: $(this).data('url'), data: $(this).data('data')}, function(resp) {
            // Emulate favourite formatted store
            if (resp.is_fav) {
                row.find('.row').addClass('fav-store border-primary');
                row.find('.js-fav-icon').removeClass('fa-star-o').addClass('fa-star');
                row.find('.js-blacklist-icon').hide();
            } else {
                row.find('.row').removeClass('fav-store border-primary');
                row.find('.js-fav-icon').removeClass('fa-star').addClass('fa-star-o');
                row.find('.js-blacklist-icon').show();
            }
        });
        return false;
    });

    /*
    Comments
    --------
    */

    selector_body.on('click', '.js-comment-add', function(event) {
        var form = $(this).parents('form');
        RB.post_ajax({elem: $(this), html: $('#comments-'+form.data('object-id')), url: form.attr('action'), data: form.serialize()}, function(resp) {
            //console.log(resp);
            if (resp.confirm_image) {
                //console.log('confirm image');
                $('#page_modal').find('.modal-title').html('Is this a MOC Photo?');
                $('#page_modal').find('#page_modal_body').html(resp.text);
                $('#page_modal').modal();
            } else {
                RB.collapseCommentImages();
            }
        });
        return false;
    });

    selector_body.on('click', '.js-comment-confirm-image', function(event) {
        // Confirmed image in comment is ok to post
        var form_id = $(this).data('form');
        var form = $('#comment-form-' + form_id);
        //console.log(form);
        RB.post_ajax({elem: $(this), html: $('#comments-'+form.data('object-id')), url: form.attr('action') + '?image_confirmed=1', data: form.serialize()}, function(resp) {
            $('.modal').modal('hide');
            RB.collapseCommentImages();
        });
        return false;
    });

    selector_body.on('click', '.js-comment-reply', function(event){
        event.preventDefault();

        var page_id = $(this).data('page-id');
        var form = $('#comment-form-' + page_id); // can be multiple forms per page eg Workbench

        if ($(this).attr('id') == 'add_new_comment_'+page_id) {
            $('#add_new_comment_'+page_id).hide();
            form.find('#save_comment_btn_' + page_id).html('<i class="fa fa-comment"></i> Add Comment');
        } else {
            $('#add_new_comment_'+page_id).show();
            form.find('#save_comment_btn_' + page_id).html('<i class="fa fa-reply"></i> Reply to Comment');
        }

        // Show avatar and resize editor
        $('#add_comment_wrapper_' + page_id + ' .add-comment-avatar').show();
        $('#add_comment_wrapper_' + page_id + ' .add-comment-editor').width('calc(100% - 60px');

        form.find('input[name=parent]').val($(this).data('comment-id'));
        $(this).parent().parent().append(form);
        $('[id^=comment_text_]').show(); // re-show any hidden comments

        // SCEditor doesn't like being moved... destroy and reinit it
        sceditor.instance(form.find('#id_comment_'+page_id)[0]).destroy();
        form.find('#id_comment_'+page_id).removeClass('bbcode-done').addClass('bbcode');
        RB.setBBCode();
        var editor = sceditor.instance(form.find('#id_comment_'+page_id)[0]);
        editor.val('');
        if (editor.height() < 90) { editor.height(90); } // min 3 rows
        form.attr('action', form.data('add-action'));
    });

    selector_body.on('click', '.js-comment-edit', function(event){
        event.preventDefault();

        var page_id = $(this).data('page-id');
        var comment_id = $(this).data('comment-id');
        var comment = $('#c'+comment_id+' .comment-body');
        var form = $('#comment-form-' + page_id); // can be multiple forms per page eg Workbench

        if ($(this).attr('id') == 'add_new_comment_'+page_id) {
            $('#add_new_comment_'+page_id).hide();
        } else {
            $('#add_new_comment_'+page_id).show();
        }

        // Remove avatar and make editor full width
        $('#add_comment_wrapper_' + page_id + ' .add-comment-avatar').hide();
        $('#add_comment_wrapper_' + page_id + ' .add-comment-editor').width('100%');

        form.find('input[name=parent]').val('');
        $(this).parent().parent().prepend(form);
        $('[id^=comment_text_]').show(); // re-show any hidden comments
        $('#comment_text_'+comment_id).hide();

        // SCEditor doesn't like being moved... destroy and reinit it
        sceditor.instance(form.find('#id_comment_'+page_id)[0]).destroy();
        form.find('#id_comment_'+page_id).removeClass('bbcode-done').addClass('bbcode');
        RB.setBBCode();
        var editor = sceditor.instance(form.find('#id_comment_'+page_id)[0]);
        editor.setWysiwygEditorValue($('#comment_text_'+comment_id).html());
        if (editor.height() < 90) { editor.height(90); } // min 3 rows
        form.find('#save_comment_btn_' + page_id).html('<i class="fa fa-save"></i> Edit Comment');
        form.attr('action', comment.data('edit_url'));
    });

    /*
    User Profile
    ------------
    */

    $('.js-load_user_avatar').on('click', function() {
        // Need to use the return function so dont use js-load-modal class.
        RB.load_modal({
            modal: $(this).data('modal'),
            elem: $($(this).data('elem')),
            url: $(this).data('url')
        }, function(data) {
            // Now we can bind fileupload
            $('#user_avatar_upload').fileupload({
                url: $(this).parent('form').attr('action'),
                dropZone: $('#change_avatar_modal'),
                dataType: 'json',
                done: function (e, data) {
                    if (data.result.status == 'success') {
                        $('#user_profile_avatar').attr('src', data.result.img_src);
                        if (data.result.msg) {
                            RB.show_success(data.result.msg);
                        }
                    } else {
                        RB.show_error(data.result.msg);
                    }
                    RB.render_elements(data.result.renders);
                    $('#user_avatar_img_upload_spinner').hide();
                },
                fail: function (e, data) {
                    console.log(data);
                    $('#user_avatar_img_upload_spinner').hide();
                    RB.show_error("ERROR " + data.jqXHR.status + ": " + data.errorThrown);
                },
                start: function (e) {
                    $('#user_profile_avatar').html('');
                    $('#user_avatar_img_upload_spinner').removeClass('hide').show().html(RB.spinner);
                },
            }).prop('disabled', !$.support.fileInput)
                .parent().addClass($.support.fileInput ? undefined : 'disabled');
        });
        return false;
    });

    /*
    Premium MOCs
    -----------------------
    */

    // Select all MOCs for Coupons/Discounts
    selector_body.on('click', '.js-select-all-mocs', function() {
        var select = $(this).parents('form').find('select[name=mocs],select[name=featured_moc_ids]');
        select.find('option').each(function() {
            $(this).prop('selected', true);
        });
        select.trigger('change');
    });

    /*
    User Lego Summary
    -----------------
    */

    selector_body.on('click', '.js-show-user-matrix-by-setlist', function() {
        $('.js-list-item-set').hide();
        $('.js-list-item-setlist').show();
        RB.set_cookie('default_part_matrix_view_type', 'L');
        return false;
    });
    selector_body.on('click', '.js-show-user-matrix-by-set', function() {
        $('.js-list-item-setlist').hide();
        $('.js-list-item-set').show();
        RB.set_cookie('default_part_matrix_view_type', 'S');
        return false;
    });


    /*
    Settings
    ---------
    */

    $('.js-save_user_settings_build').on('click', function() {
        RB.post_ajax({elem: $(this), url: $(this).data('url'),
            data: $('#default_build_options_form').serialize() + '&' + $('#build_search_form').serialize()});
        return false;
    });

    blink_field = function(field) {
        field.addClass('border-green');
        setTimeout(function() {field.removeClass('border-green')}, 200);
    };

    // Clicked Personalisation Settings - Page Header
    selector_body.on('change', '#tab_personalisation select[name=page_header]', function() {
        var new_class = $(this).val();
        $('#page_header').removeClass(function (index, css) {
            return (css.match (/(^|\s)page-header-bg-\S+/g) || []).join(' ');
        }).addClass(new_class);
    });
    // Clicked Personalisation Settings - Background
    selector_body.on('change', '#tab_personalisation select[name=body_bg]', function() {
        var new_class = $(this).val();
        selector_body.removeClass(function (index, css) {
            return (css.match (/(^|\s)boxed.*/g) || []).join(' ');
        }).addClass(new_class);
    });
    // Clicked Personalisation Settings - Max Width
    selector_body.on('change', '#tab_personalisation select[name=max_width]', function() {
        var new_class = $(this).val();
        $('#wrapper').removeClass(function (index, css) {
            return (css.match (/(^|\s)wrapper-wide.*/g) || []).join(' ');
        }).addClass(new_class);
    });
    // Clicked Personalisation Settings - Dark Mode
    selector_body.on('change', '#tab_personalisation input[name=dark_mode]', function() {
        if ($(this).is(':checked')) {
            selector_body.addClass('dark-mode');
            RB.toggle_dark_mode();
        } else {
            selector_body.removeClass('dark-mode');
            RB.toggle_dark_mode();
        }
        $('#user_personalisation_form').submit();
    });
    // Changed from within menu
    selector_body.on('change', '.js-toggle-dark-mode input[name=dark_mode]', function() {
        if ($(this).is(':checked')) {
            selector_body.addClass('dark-mode');
            RB.toggle_dark_mode();
        } else {
            selector_body.removeClass('dark-mode');
            RB.toggle_dark_mode();
        }
    });
    // Clicked Personalisation Settings - High Contrast
    selector_body.on('change', '#tab_personalisation input[name=high_contrast]', function() {
        if ($(this).is(':checked')) {
            selector_body.addClass('text-high-contrast');
        } else {
            selector_body.removeClass('text-high-contrast');
        }
        $('#user_personalisation_form').submit();
    });
    // Clicked Personalisation Settings - Color Blind
    selector_body.on('change', '#tab_personalisation input[name=color_blind]', function() {
        $('#user_personalisation_form').submit();
    });
    // Clicked Personalisation Settings - Sticky header
    selector_body.on('change', '#tab_personalisation input[name=disable_sticky_header]', function() {
        $('#user_personalisation_form').submit();
    });
    selector_body.on('change', '#tab_personalisation input[name=topbar_lists]', function() {
        $('#user_personalisation_form').submit();
    });
    selector_body.on('change', '#tab_personalisation input[name=collapse_comment_images]', function() {
        $('#user_personalisation_form').submit();
    });
    selector_body.on('blur', '#tab_personalisation input[name=ga_tracking_id]', function() {
        blink_field($(this));
        $('#user_personalisation_form').submit();
    });
    selector_body.on('change', '#tab_personalisation select', function() {
        blink_field($(this));
        $('#user_personalisation_form').submit();
    });

    selector_body.on('blur', '#designer_social_media_form input', function() {
        blink_field($(this));
        $('#designer_social_media_form').submit();
    });

    // Changed Default Set List in API Settings
    $('#tab_api select[name=default_import_set_list]').on('change', function() {
        $('#user_default_import_set_list_form').submit();
    });

    // Changed default group by settings
    $('#user_default_group_by_form select').on('change', function() {
        $('#user_default_group_by_form').submit();
    });

    // Save user default view settings
    $('#user_default_view_tiles_form').on('click', '.js-view-parts-small, .js-view-parts-medium, .js-view-parts-large', function() {
        RB.post_ajax({
            url: $(this).parents('#user_default_view_tiles_form').data('url'),
            data: 'view_parts_size=' + $(this).data('size')
        });
    });
    $('#user_default_view_tiles_form').on('click', '.js-view-sets-small, .js-view-sets-medium, .js-view-sets-large', function() {
        RB.post_ajax({
            url: $(this).parents('#user_default_view_tiles_form').data('url'),
            data: 'view_sets_size=' + $(this).data('size')
        });
    });

    // Changed notification frequency setting
    selector_body.on('change', '.js-select-change-submit', function() {
        /*console.log($(this));
        console.log($(this).data('url'));
        console.log($(this).attr('name'));
        console.log($(this).val());*/
        RB.post_ajax({
            elem: $(''),
            url: $(this).data('url'),
            data: $(this).attr('name') + '=' + $(this).val()
        })
    });

});
