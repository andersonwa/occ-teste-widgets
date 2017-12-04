/**
 * @fileoverview Mega Menu Widget.
 *
 */
define(
    //-------------------------------------------------------------------
    // DEPENDENCIES
    //-------------------------------------------------------------------
    ['knockout', 'ccConstants', 'notifications', 'pubsub', 'CCi18n', 'spinner', 'ccStoreConfiguration','storageApi'],
    //-------------------------------------------------------------------
    // MODULE DEFINITION
    //-------------------------------------------------------------------
    function(ko, CCConstants, notifications, pubsub, CCi18n, spinner, CCStoreConfiguration,storageApi) {

        "use strict";

        return {
            elementName: 'pft-header-dropdown-navigation',
            categories: ko.observableArray(),
            storeConfiguration: CCStoreConfiguration.getInstance(),
            // Spinner resources
            catalogMenuBlock: '#CC-megaMenu',
            menuOptions: {
                parent: '#CC-megaMenu',
                posTop: '40px',
                posLeft: '30%'
            },
            isMobile: ko.observable(false),
            store: ko.observable(),
            
            onLoad: function(widget) {

                var self = this;



                self.store(storageApi.getInstance().getItem("pft.selectedStore") || "CS");
                $.Topic("STORE_CHANGED").subscribe(function(msg){
                    console.info("STORE_CHANGED", msg);
                    self.store(msg);
                });




                widget.menuName = 'CC-CategoryNav';

                // widget.isMobile = ko.observable(false);

                $(window).resize(function() {
                    self.checkResponsiveFeatures($(window).width());
                });
                $(document).on('mouseover', 'li.cc-desktop-dropdown', function() {
                    $(this).children('ul.dropdown-menu').css({ 'display': 'block', 'top': 'auto' });
                    if (navigator.userAgent.indexOf("Firefox") != -1) {
                        $("#CC-product-listing-sortby-controls select.form-control").hide();
                    } else {
                        $("#CC-product-listing-sortby-controls select.form-control").css('visibility', 'hidden');
                    }
                });
                $(document).on('mouseout', 'li.cc-desktop-dropdown', function() {
                    $(this).children('ul.dropdown-menu').css({ 'display': 'none' });
                    if (navigator.userAgent.indexOf("Firefox") != -1) {
                        $("#CC-product-listing-sortby-controls select.form-control").show();
                    } else {
                        $("#CC-product-listing-sortby-controls select.form-control").css('visibility', 'visible');
                    }
                });
                $(document).on('keydown', 'a.Level1', function(event) {
                    if (event.which === 9 && event.shiftKey) {
                        $(this).next('ul.dropdown-menu').css({ 'display': 'none' });
                    } else if (event.which == 27) {
                        $(this).next('ul.dropdown-menu').css({ 'display': 'none' });
                    } else if (event.which == 9) {
                        $(this).next().children('a.Level2').parents('ul.dropdown-menu').css({ 'display': 'block', 'top': 'auto' });
                    } else if (event.which == 13) {
                        $(this).next('ul.dropdown-menu').css({ 'display': 'none' });
                    }
                });
                $(document).on('keydown', 'a.Level2', function(event) {
                    if (event.which == 27) {
                        $(this).parents('ul.dropdown-menu').css({ 'display': 'none' });
                    } else if (event.which == 9) {
                        $(this).next().children('a.Level3').parents('ul.dropdown-menu').css({ 'display': 'block', 'top': 'auto' });
                    } else if (event.which == 13) {
                        $(this).parents('ul.dropdown-menu').css({ 'display': 'none' });
                    }
                });
                $(document).on('keydown', 'a.Level3', function(event) {
                    if (event.which == 27) {
                        $(this).parents('ul.dropdown-menu').css({ 'display': 'none' });
                    } else if (event.which == 9) {
                        if ($(this).parent('li').next('li').children('a.Level3').length != 0 || $(this).parents('div.child-category-container').next('div.child-category-container').children('a.Level2').length != 0) {} else {
                            $(this).parents('ul.dropdown-menu').parent('li.cc-desktop-dropdown').next('li.cc-desktop-dropdown').focus();
                        }
                    } else if (event.which == 13 && navigator.userAgent.indexOf("MSIE") == -1 && !navigator.userAgent.match(/Trident.*rv\:11\./)) {
                        $(this).parents('ul.dropdown-menu').css({ 'display': 'none' });
                    }
                });
                $(document).on('blur', 'a.Level3', function(event) {
                    if ($(this).parent('li').next('li').children('a.Level3').length != 0 || $(this).parents('div.child-category-container').next('div.child-category-container').children('a.Level2').length != 0) {} else {
                        $(this).parents('ul.dropdown-menu').css({ 'display': 'none' });
                    }
                });
                $(document).on('focus', 'li.cc-desktop-dropdown', function() {
                    $(this).children('ul.dropdown-menu').css({ 'display': 'block', 'top': 'auto' });
                });
                if (widget.user() != undefined && widget.user().catalogId) {
                    widget.catalogId(widget.user().catalogId());
                }
                self.setCategoryList(widget);

            },

            /**
             * Updates categories if user catalog changes.
             */
            beforeAppear: function(page) {
                var widget = this;

                if (ko.isObservable(widget.user) && widget.user() &&
                    ko.isObservable(widget.user().catalogId) && widget.user().catalogId()) {
                    if (widget.user().catalogId() != widget.catalogId()) {
                        widget.categories([]);
                        widget.createSpinner();
                        widget.catalogId(widget.user().catalogId());
                        widget.setCategoryList();
                        widget.destroySpinner();
                    }
                }
            },

            /**
             * Get the categories for the catalog and set it to the widget.
             */
            setCategoryList: function(widget) {
                var self = this;
                var params = {};
                var contextObj = {};
                contextObj[CCConstants.ENDPOINT_KEY] = CCConstants.ENDPOINT_COLLECTIONS_GET_COLLECTION;
                contextObj[CCConstants.IDENTIFIER_KEY] = "megaMenuNavigation";
                var filterKey = self.storeConfiguration.getFilterToUse(contextObj);
                if (filterKey) {
                    params[CCConstants.FILTER_KEY] = filterKey;
                }
                // console.log('widget.catalogId', widget.catalogId());
                // console.log('widget.rootCategoryId', widget.rootCategoryId());
                // console.log('self.load', self.load());
                console.log('widget.load', widget.load);
                //Load the categoryList
                widget.load('categoryList', [widget.rootCategoryId(), widget.catalogId(), 1000], params,
                    function(result) {

                        self.checkResponsiveFeatures($(window).width());

                        var arraySize, maxElementCount;
                        arraySize = result.length;
                        maxElementCount = parseInt(widget.maxNoOfElements(), 1000);

                        if (arraySize > maxElementCount) {
                            arraySize = maxElementCount;
                            result = result.slice(0, maxElementCount);
                        }
                        console.log(widget.categories)
                        self.categories.valueWillMutate();
                        // Removing child categories initially to display only the first level
                        // of categories on UI.
                        for (var i = 0; i < result.length; i++) {
                            var category = $.extend({}, result[i]);
                            if (category.hasOwnProperty("childCategories")) {
                                category.showCaret = true;
                                delete category.childCategories;
                            } else {
                                category.showCaret = false;
                            }
                            self.categories.push(category);
                            console.log('category', category);
                        }
                        self.categories.valueHasMutated();

                        var categoriesSet = false;
                        // This adds the child categories back to the parent/first level categories.
                        $(document).one('mouseover focus', '#CC-megaMenu', function() {
                            if (!categoriesSet) {
                                self.categories(result);
                                categoriesSet = true;
                            }
                        });
                        $(document).ready(function() {
                            if (!categoriesSet) {
                                self.categories(result);
                                categoriesSet = true;
                            }
                        });
                    },
                    widget);
            },

            /**
             * Destroy spinner.
             */
            destroySpinner: function() {
                var widget = this;
                $(widget.catalogMenuBlock).removeClass('loadingIndicator');
                spinner.destroy(1);
            },

            /**
             * Creates spinner.
             */
            createSpinner: function() {
                var widget = this;
                $(widget.catalogMenuBlock).css('position', 'relative');
                widget.menuOptions.loadingText = 'Loading';
                spinner.createWithTimeout(widget.menuOptions, 5000);
            },

            /**
             * Menu items click event used to set focus to product listing result section
             *
             * data - knockout data
             * event - event data
             */
            catMenuClick: function(data, event) {
                $.Topic(pubsub.topicNames.OVERLAYED_GUIDEDNAVIGATION_HIDE).publish([{ message: "success" }]);
                $.Topic(pubsub.topicNames.UPDATE_FOCUS).publishWith({ WIDGET_ID: "productListing" }, [{ message: "success" }]);
                return true;
            },

            checkResponsiveFeatures: function(viewportWidth) {
                if (viewportWidth > 978) {
                    this.isMobile(false);
                } else if (viewportWidth <= 978) {
                    this.isMobile(true);
                }
            },

            /**
             * sub sub menu click event - key press event handle
             *
             * data - knockout data
             * event - event data
             */
            navigationCategoryClick: function(data, event) {
                notifications.emptyGrowlMessages();
                var $this, parent;

                event.stopPropagation();

                $this = $(event.target).parent("li");
                parent = $this.parent().parent();

                if ($(event.target).parent().hasClass('dropdown-submenu')) {
                    event.preventDefault();
                }

                if ($this.hasClass('open')) {
                    // Closes previously open categories
                    $this.removeClass('open').addClass('closed');

                } else {
                    if (parent.hasClass('open')) {
                        $('.dropdown-submenu.open').removeClass('open').addClass('closed');
                        if ($this.hasClass('closed')) {
                            // Opens a previously closed category
                            $this.removeClass('closed').addClass('open');
                            return false;
                        } else {
                            $this.removeClass('open').addClass('closed');
                        }
                    }
                }

                return true;
            },

            megaMenuClick: function(data, event) {
                notifications.emptyGrowlMessages();
                $.Topic(pubsub.topicNames.OVERLAYED_GUIDEDNAVIGATION_HIDE).publish([{ message: "success" }]);
                event.stopPropagation();
                return true;
            }

        };
    });
