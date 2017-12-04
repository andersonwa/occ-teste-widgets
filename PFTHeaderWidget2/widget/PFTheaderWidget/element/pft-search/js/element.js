define(
    //-------------------------------------------------------------------
    // DEPENDENCIES
    //-------------------------------------------------------------------
    ['jquery', 'knockout', 'pubsub', 'notifications', 'ccConstants',
        'viewModels/searchTypeahead', 'placeholderPatch', 'navigation'
    ],

    //-------------------------------------------------------------------
    // MODULE DEFINITION
    //-------------------------------------------------------------------
    function($, ko, pubsub, notifications, CCConstants, searchTypeahead,
        placeholder, navigation) {
        "use strict";

        var ELEMENT_NAME = 'pft-search';

        return {
            elementName: ELEMENT_NAME,

            searchText: ko.observable(""),
            SEARCH_SELECTOR: '.search-query',

            handleKeyPress: function(data, event) {
                // displays modal dialog if search is initiated with unsaved changes.
                if (data.user().isUserProfileEdited()) {
                    $("#CC-customerProfile-modal").modal('show');
                    data.user().isSearchInitiatedWithUnsavedChanges(true);
                    return false;
                }
                var keyCode;

                keyCode = (event.which ? event.which : event.keyCode);

                switch (keyCode) {
                    case CCConstants.KEY_CODE_ENTER:
                        // Enter key
                        this['elements'][ELEMENT_NAME].handleSearch(data, event);
                        //document.activeElement.blur();
                        $("input#CC-headerWidget-Search-Mobile").blur();
                        return false;
                }
                return true;
            },

            // publishes a message to say create a search
            handleSearch: function(data, event) {
                // Executing a full search, cancel any search typeahead requests
                $.Topic(pubsub.topicNames.SEARCH_TYPEAHEAD_CANCEL).publish([{
                    message: "success"
                }]);

                var trimmedText = $.trim(this.searchText());
                if (trimmedText.length != 0) {

                    // Send the search results and the related variables for the Endeca query on the URI
                    navigation.goTo("/searchresults" + "?" +
                        CCConstants.SEARCH_TERM_KEY + "=" +
                        encodeURIComponent(this.searchText().trim()) + "&" +
                        CCConstants.SEARCH_DYM_SPELL_CORRECTION_KEY + "=" +
                        encodeURIComponent(CCConstants.DYM_ENABLED) + "&" +
                        CCConstants.SEARCH_NAV_ERECS_OFFSET + "=0&" +
                        CCConstants.SEARCH_REC_PER_PAGE_KEY + "=" +
                        CCConstants.DEFAULT_SEARCH_RECORDS_PER_PAGE + "&" +
                        CCConstants.SEARCH_RANDOM_KEY + "=" + Math.floor(Math.random() * 1000) + "&" +
                        CCConstants.SEARCH_TYPE + "=" + CCConstants.SEARCH_TYPE_SIMPLE + "&" +
                        CCConstants.PARAMETERS_TYPE + "=" + CCConstants.PARAMETERS_SEARCH_QUERY);
                    this.searchText('');
                }
            },

            // Initializes search typeahead and the placeholder text
            initializeSearch: function() {
                this['elements'][ELEMENT_NAME].initTypeahead.bind(this)();
                this['elements'][ELEMENT_NAME].addPlaceholder();
            },

            initTypeahead: function() {
                var typeAhead = searchTypeahead.getInstance(this['elements'][ELEMENT_NAME].SEARCH_SELECTOR, this.site().selectedPriceListGroup().currency);
                notifications.emptyGrowlMessages();
            },

            addPlaceholder: function() {
                $('#CC-headerWidget-Search-Desktop').placeholder();
                $('#CC-headerWidget-Search-Mobile').placeholder();
            },

            /**
             * Invoked when the search text box is in focus.
             * Used to fix the bug with growl messages not clearing on clicking
             * the search box
             */
            searchSelected: function() {
                notifications.emptyGrowlMessages();
                $.Topic(pubsub.topicNames.OVERLAYED_GUIDEDNAVIGATION_HIDE).publish([{
                    message: "success"
                }]);
            },

            /**
             * Hide the search typeahead dropdown when the button is used for search
             */
            hideSearchDropdown: function(data, event) {
                var keyCode = (event.which ? event.which : event.keyCode);
                if (keyCode === CCConstants.KEY_CODE_ENTER) {
                    $('#typeaheadDropdown').hide();
                } else {
                    return true;
                }
            }
        };
    }
);
