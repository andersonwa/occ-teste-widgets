define(
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['jquery', 'knockout', 'ccConstants', 'ccRestClient', 'notifications', 'pubsub', 'storageApi', 'navigation'],

  // -------------------------------------------------------------------
  // MODULE DEFINITION
  // -------------------------------------------------------------------
  function ($, ko, CCConstants, CCRestClient, notifications, pubsub, storageApi, navigation) {
    "use strict";

    return {
      elementName: 'header-currency-picker',

      defaultPriceListGroup: ko.observable(),
      activePriceListGroups: ko.observableArray([]),
      currencyDropdownVisible: ko.observable(false),
      currentCurrencyPosition: ko.observable(),
      onLoad: function(widget) {
        var self = this;
        var optedPriceListGroup = null;
        self.loadPicker(widget.site());

        self.handleCurrencyChange = function(currencyPosition) {
          var chosenPriceListGroup = this;
          var displayedPriceListGroup = widget.site().selectedPriceListGroup();
          // check if the cart contains any item with child-items (i.e. check for Configurable Product)
          self.currentCurrencyPosition(currencyPosition);
          var configurableProductFound = false;
          for (var i = 0; i < widget.cart().items().length; i++) {
            if (widget.cart().items()[i].childItems) {
              configurableProductFound = true;
              break;
            }
          }
          if (configurableProductFound) {
            optedPriceListGroup = this;
            $('#cc-cpqconfirmationmodalpane').modal();
          } else {
          // Storing selected currency in the local storage
          if (optedPriceListGroup) {
            chosenPriceListGroup = optedPriceListGroup;
          }
          self.storePriceListGroupInLocalStorage(chosenPriceListGroup);
          self.activePriceListGroups()[currencyPosition] = displayedPriceListGroup;
          self.sortCurrencies();
          self.hideCurrencyDropDown();
          if (navigation.getRelativePath().indexOf(widget.links().searchresults.route) !== -1) {
            var queryString = decodeURIComponent(window.location.search);
            queryString = queryString.replace('?','');
            var params = queryString.split('&');
            var newQueryString = '';
            for (var i = 0; i < params.length; i++) {
              if (params[i].split('=')[0] === 'Nr') {
                if (newQueryString === '') {
                  newQueryString = 'Nr=' + widget.processNrParameter(params[i].split('=')[1], 'currency-picker');
                } else {
                  newQueryString = newQueryString + '&' + 'Nr=' + widget.processNrParameter(params[i].split('=')[1], 'currency-picker');
                }
              } else {
                if (newQueryString === '') {
                  newQueryString = params[i];
                } else {
                  newQueryString = newQueryString + '&' + params[i];
                }
              }
            }
            var newURL = navigation.getBaseURL() + '/' + navigation.getPath() + "?" + newQueryString;
            window.location.assign(newURL);
          }
          else {
            window.location.reload();
          }
          }
        };

        widget.site().activePriceListGroups.subscribe(function (newValue) {
          self.loadPicker(widget.site());
        });
      },

      /**
       * Deletes all the configurable products present in the cart and recalls handleCurrencyChange
       * 
       */
      handleDeleteConfigurableItems : function(data, event) {
        for (var i = 0; i < data.cart().items().length; i++) {
          if (data.cart().items()[i].childItems) {
            data.cart().removeItem(data.cart().items()[i]);
          }
        }
        this.handleCurrencyChange(this.currentCurrencyPosition());
      },

      loadPicker : function (pSiteData) {
        var self = this;

        if (pSiteData.priceListGroup.defaultPriceListGroup) {
          self.defaultPriceListGroup(null);
          self.defaultPriceListGroup(pSiteData.priceListGroup.defaultPriceListGroup);
        }

        if (pSiteData.priceListGroup.activePriceListGroups.length) {
          self.activePriceListGroups.removeAll();
          for (var i = 0; i < pSiteData.priceListGroup.activePriceListGroups.length; i++) {
            self.activePriceListGroups.push(pSiteData.priceListGroup.activePriceListGroups[i]);
          }
        }

        // get the currency from local data.
        var localDataCurrencyItem = JSON.parse(CCRestClient.getStoredValue(CCConstants.LOCAL_STORAGE_CURRENCY));
        var localDataPriceListGroupId = JSON.parse(CCRestClient.getStoredValue(CCConstants.LOCAL_STORAGE_PRICELISTGROUP_ID));
        // if currency is not present in localStorage, persist the default currency and price list group id to local storage
        if ( !localDataCurrencyItem && self.defaultPriceListGroup() ) {
          // Storing in site view model
          pSiteData.selectedPriceListGroup(self.defaultPriceListGroup());
          self.storePriceListGroupInLocalStorage(self.defaultPriceListGroup());
        } else {
          // Check whether the currency stored in local storage is still active or not
          var isActive = false;
          for (var i = 0; i < self.activePriceListGroups().length; i++) {
            if (localDataCurrencyItem.repositoryId === self.activePriceListGroups()[i].currency.repositoryId &&
                (localDataPriceListGroupId == self.activePriceListGroups()[i].id)) {
              // Storing in site view model
              pSiteData.selectedPriceListGroup(self.activePriceListGroups()[i]);
              self.storePriceListGroupInLocalStorage(self.activePriceListGroups()[i]);
              isActive = true;
              break;
            }
          }
          // Suppose the selected currency is not active any more. Setting the default currency to be displayed
          if (!isActive && self.defaultPriceListGroup()) {
            // Storing in site view model as well
            pSiteData.selectedPriceListGroup(self.defaultPriceListGroup());
            self.storePriceListGroupInLocalStorage(self.defaultPriceListGroup());
          }
        }

        // To remove the displayed price list from the list of active price list
        var displayedPriceListGroupId = pSiteData.selectedPriceListGroup().id;
        for (var i = 0; i < self.activePriceListGroups().length; i++) {
          if (self.activePriceListGroups()[i].id === displayedPriceListGroupId) {
            self.activePriceListGroups.splice(i, 1);
          }
        }

        // Sort the currencies based on their currency code
        self.sortCurrencies();
      },

      sortCurrencies : function() {
        var self = this;
        self.activePriceListGroups.sort(function(left, right) {
          return left.currency.currencyCode == right.currency.currencyCode ? 0 : 
              (left.currency.currencyCode < right.currency.currencyCode ? -1 : 1);
        });
      },

      /**
       * Adds the passed price list group to window local storage
       */ 
      storePriceListGroupInLocalStorage : function (pPriceListGroup) {
        var self =  this;
        CCRestClient.setStoredValue(CCConstants.LOCAL_STORAGE_CURRENCY,
            ko.toJSON(pPriceListGroup.currency));
        CCRestClient.setStoredValue(CCConstants.LOCAL_STORAGE_PRICELISTGROUP_ID,
            ko.toJSON(pPriceListGroup.id));
      },

      /**
       * key press event handle
       * 
       * data - knockout data 
       * event - event data
       */ 
      keypressCurrencyHandler : function(data, event){

        var self, $this, keyCode;

        self = this; 
        $this = $(event.target);
        keyCode = event.which ? event.which : event.keyCode;

        if (event.shiftKey && keyCode == CCConstants.KEY_CODE_TAB) {
          keyCode = CCConstants.KEY_CODE_SHIFT_TAB;
        }
        var lastCurrencyElementId = "CC-header-Currency-" + ((self.activePriceListGroups().length) - 1 );
        switch(keyCode) {
          case CCConstants.KEY_CODE_TAB:
            if (($this[0].id === lastCurrencyElementId)) {
              self.hideCurrencyDropDown(); 
            }
            break;

          case CCConstants.KEY_CODE_SHIFT_TAB:
            if (($this[0].id === "CC-header-currency-link")) {
              self.hideCurrencyDropDown();
            }
            break;
        }
        return true;
      },

      /**
       * Shows the Currency dropdown based on visible flag
       * 
       */
      showCurrencyDropDown: function() {
        var self = this;
        $('#headerCurrencyPicker').addClass('active');

        // Tell the template its OK to display the currency picker.
        self.currencyDropdownVisible(true);
        notifications.emptyGrowlMessages();

        $(document).on('mouseleave','#headerCurrencyPicker', function() {
          self.hideCurrencyDropDown();
        });

        // to handle the mouseout/mouseleave events for ipad for currency-picker
        var isiPad = navigator.userAgent.match(CCConstants.IPAD_STRING) != null;
        if (isiPad) {
          $(document).on('touchend', function(event) {
            if (!($(event.target).closest('#headerCurrencyPicker').length)) {
              self.hideCurrencyDropDown();
            }
          });
        }
      },

      /**
       * Hides the currency dropdown based on visible flag
       */
      hideCurrencyDropDown: function() {
        // Tell the template the currency should no longer be visible.
        this.currencyDropdownVisible(false);
        $('#headerCurrencyPicker').removeClass('active');
        return true;
      },

      /**
       * Toggles the currency dropdown to show/hide it upon click on link
       */
      toggleCurrencyDropDown: function() {
        if($('#headerCurrencyPicker').hasClass('active')) {
          this.hideCurrencyDropDown();  
        } else {
          this.showCurrencyDropDown();
        }  
      }
    };
  }
);