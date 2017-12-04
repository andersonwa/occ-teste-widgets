define(
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['jquery', 'knockout', 'pubsub', 'ccConstants', 'ccRestClient', 'notifications', 'navigation'],

  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function ($, ko, pubsub, CCConstants, CCRestClient, notifications, navigation) {
    "use strict";

    return {
      elementName: 'header-language-picker',

      selectedLocaleId: ko.observable(),
      selectedLocale: ko.observable(),
      languageLinkText: ko.observable(''),
      languageDropdownVisible: ko.observable(false),
      supportedLocales: ko.observableArray([]),
      redirectToLink: ko.observable('#'),
      
      onLoad: function(widget) {
        var self = this;

        //get the supported locales.
        if (widget.site().additionalLanguages) {
          self.supportedLocales(widget.site().additionalLanguages);
        }

        //sort the supported locales.
        self.sortLocales();

        //get browser locale
        var browserLanguageRaw = (navigator.languages) ? navigator.languages[0] : 
            (navigator.userLanguage) ? navigator.userLanguage : navigator.language;
        var browserLanguage = browserLanguageRaw.replace("-", "_");
        // check if browser locale is in supported locales.
        var browserLocaleItem = $.grep(self.supportedLocales(), function (item) {
          return item.name === browserLanguage;
        });

        //get default locale
        var defaultLocaleItem = $.grep(self.supportedLocales(), function (item) {
          return item.name === widget.locale();
        });
        
        //If the locale is not set, it is no longer supported, call to update it to current SF locale
        if (!widget.user().locale() && widget.user().loggedIn()) {
          $.Topic(pubsub.topicNames.USER_LOCALE_NOT_SUPPORTED).publish();	
        }

        //get the locale from local data.
        var localDataLocaleItem = JSON.parse(CCRestClient.getStoredValue(CCConstants.LOCAL_STORAGE_USER_CONTENT_LOCALE));
        // if locale is not present in localStorage, set the localStorage value to browser locale or default locale.
        if (!localDataLocaleItem || !localDataLocaleItem[0]) {
          if (browserLocaleItem && browserLocaleItem[0]) {
            self.selectedLocale(browserLocaleItem[0]);
            self.selectedLocaleId(browserLocaleItem[0].localeId);
            CCRestClient.setStoredValue(CCConstants.LOCAL_STORAGE_USER_CONTENT_LOCALE, ko.toJSON(browserLocaleItem));
          } else if (defaultLocaleItem && defaultLocaleItem[0]) {
            self.selectedLocale(defaultLocaleItem[0]);
            self.selectedLocaleId(defaultLocaleItem[0].localeId);
            CCRestClient.setStoredValue(CCConstants.LOCAL_STORAGE_USER_CONTENT_LOCALE, ko.toJSON(defaultLocaleItem));
          } else {
            $.Topic(pubsub.topicNames.USER_LOCALE_NOT_SUPPORTED).publish();
            window.location.reload();
          }
        } else if (!self.selectedLocale() && !self.selectedLocaleId()) {
          // check if the locale present in local data is one of supported locales.
          var localSupportedLocale = $.grep(self.supportedLocales(), function (item) {
            return item.localeId === localDataLocaleItem[0].localeId;
          });
          if(localSupportedLocale && localSupportedLocale[0]) {
            self.selectedLocale(localSupportedLocale[0]);
            self.selectedLocaleId(localSupportedLocale[0].localeId);
          } else {
            CCRestClient.clearStoredValue(CCConstants.LOCAL_STORAGE_USER_CONTENT_LOCALE);
            window.location.reload();
          }
        }

        self.selectedLocaleId.subscribe(function(localeId) {
          var selectedLocaleItem = $.grep(self.supportedLocales(), function (item) {
            return item.localeId === localeId;
          });
          if (selectedLocaleItem && selectedLocaleItem.length > 0 && selectedLocaleItem[0].localeId != self.selectedLocale().localeId) {
            self.selectedLocale(selectedLocaleItem[0]);
            self.selectedLocaleId(selectedLocaleItem[0].localeId);
            // Handle the localized URL
            if (!widget.user().loggedIn()) {
              widget.redirectToLocalizedURL(self.selectedLocale().name, defaultLocaleItem[0].name);
            }
          }
        }.bind(self));

        if (self.selectedLocale()) {
          self.languageLinkText(self.selectedLocale().name.toUpperCase());
        }

        self.handleLanguageChange = function(data) {
          var self = this;
          self.redirectToLink('/' + navigation.getPath());
          if (widget.user().isUserProfileEdited()) {
            return true;
          }
          if (data) {
            self.selectedLocaleId(data.localeId);
          }
          if(widget.user().loggedIn()) {
            self.handleUpdateProfileLocale();
          }
          if (navigation.getRelativePath().indexOf(widget.links().searchresults.route) !== -1) {
            var queryString = decodeURIComponent(window.location.search);
            queryString = queryString.replace('?','');
            var params = queryString.split('&');
            var newQueryString = '';
            for (var i = 0; i < params.length; i++) {
              if (params[i].split('=')[0] === 'Nr') {
                if (newQueryString === '') {
                  newQueryString = 'Nr=' + widget.processNrParameter(params[i].split('=')[1], 'language-picker');
                } else {
                  newQueryString = newQueryString + '&' + 'Nr=' + widget.processNrParameter(params[i].split('=')[1], 'language-picker');
                }
              } else {
                if (newQueryString === '') {
                  newQueryString = params[i];
                } else {
                  newQueryString = newQueryString + '&' + params[i];
                }
              }
            }
            var newURL = navigation.getBaseURL() + '/' + data.name + navigation.getPathWithoutLocale().split('?')[0] + "?" + newQueryString;
            window.location.assign(newURL);
          }
        };
        
        self.handleUpdateProfileLocale = function () {
          widget.user().locale(self.selectedLocale().name);
          if(widget.user().locale.isModified !== undefined) {
            widget.user().locale.isModified(true);
            $.Topic(pubsub.topicNames.USER_PROFILE_UPDATE_SUBMIT).publishWith(widget.user(), [{message: "success"}]);
          }
          if(widget.user().locale.isModified !== undefined) {
              widget.user().locale.isModified(false);
            }
        };
        
        /**
         * Saves the profile locale to header if it is different from the current locale stored in header
         */
        self.saveLocaleToHeader = function() {
          var currentLocale = JSON.parse(CCRestClient.getStoredValue(CCConstants.LOCAL_STORAGE_USER_CONTENT_LOCALE));
          if (Array.isArray(currentLocale)) {
            var currentLocale = currentLocale[0].name; 
          } else {
              var currentLocale = currentLocale.name;  
          }
          //In the case where the updated locale has not been saved to profile
          if ((currentLocale !== self.selectedLocale().name)){
            widget.redirectToLocalizedURL(self.selectedLocale().name, currentLocale);
          }
          //In the case where locale has been updated from profile page
          else if (currentLocale !== widget.user().locale()) {
            widget.redirectToLocalizedURL(widget.user().locale(), currentLocale);
          }
        };
        
        //Set the profile locale as SF locale if it is a supported locale on login.
        $.Topic(pubsub.topicNames.USER_LOGIN_SUCCESSFUL).subscribe(function(obj) {
          if(!widget.user().locale()) {
            $.Topic(pubsub.topicNames.USER_LOAD_SHIPPING).subscribe(self.setProfileLocaleAsStoreLocale);  
          } else {
            self.setProfileLocaleAsStoreLocale();
          }
        });
        
        self.setProfileLocaleAsStoreLocale = function() {
          if(self.selectedLocale().name !== widget.user().locale()) {
            for (var i=0; i<widget.site().additionalLanguages.length; i++) {
              if (widget.user().locale() === widget.site().additionalLanguages[i].name) {
                widget.redirectToLocalizedURL(widget.user().locale(), self.selectedLocale().name);
                break;
              }
            }
          }
          $.Topic(pubsub.topicNames.USER_LOAD_SHIPPING).unsubscribe();
        }
            
          $.Topic(pubsub.topicNames.USER_PROFILE_UPDATE_SUCCESSFUL).subscribe(function() {
            //Update the profile locale to custom header
            self.saveLocaleToHeader();
          });
          
          $.Topic(pubsub.topicNames.USER_PROFILE_UPDATE_INVALID).subscribe(function() {
              //Update the profile locale to custom header
              self.saveLocaleToHeader();
            });
          
          $.Topic(pubsub.topicNames.USER_PROFILE_UPDATE_FAILURE).subscribe(function() {
            
            self.saveLocaleToHeader();
          });          
      },

      sortLocales: function () {
        var self = this;
        this.supportedLocales.sort(function(left, right) {
          return left.displayName == right.displayName ? 0 : (left.displayName < right.displayName ? -1 : 1);
        });
      },

      /**
       * key press event handle
       * 
       * data - knockout data 
       * event - event data
       */ 
      keypressLanguageHandler : function(data, event){

        var self, $this, keyCode;

        self = this; 
        $this = $(event.target);
        keyCode = event.which ? event.which : event.keyCode;

        if (event.shiftKey && keyCode == CCConstants.KEY_CODE_TAB) {
          keyCode = CCConstants.KEY_CODE_SHIFT_TAB;
        }
        var lastLocaleElementId = "CC-header-languagePicker-" + ((self.supportedLocales().length) - 1) ;
        switch(keyCode) {
          case CCConstants.KEY_CODE_TAB:
            if (($this[0].id === lastLocaleElementId)) {
              self.hideLanguageDropDown();
            }
            break;

          case CCConstants.KEY_CODE_SHIFT_TAB:
            if ($this[0].id === "CC-header-language-link") {
              self.hideLanguageDropDown();
            }
        }
        return true;
      },

      /**
       * Shows the Language dropdown based on visible flag
       * 
       */
      showLanguageDropDown: function() {
        // Tell the template its OK to display the cart.
        this.languageDropdownVisible(true);

        notifications.emptyGrowlMessages();

        $('#languagedropdown').addClass('active');
        $('#languagedropdown > .content').fadeIn('slow');

        $(document).on('mouseleave','#languagedropdown', function() {
          $('#languagedropdown > .content').fadeOut('slow');
          $(this).removeClass('active');
        });

        // to handle the mouseout/mouseleave events for ipad for language-picker
        var isiPad = navigator.userAgent.match(CCConstants.IPAD_STRING) != null;
        if (isiPad) {
          $(document).on('touchend', function(event) {
            if (!($(event.target).closest('#languagedropdown').length)) {
              $('#languagedropdown > .content').fadeOut('slow');
              $('#languagedropdown').removeClass('active');
            }
          });   
        }
      },

      /**
       * Hides the language dropdown based on visible flag
       */
      hideLanguageDropDown: function() {
        // Tell the template the cart should no longer be visible.
        this.languageDropdownVisible(false);

        $('#languagedropdown > .content').fadeOut('slow');
        $('#languagedropdown').removeClass('active');

        return true;
      },

      /**
       * Toggles the language dropdown to show/hide it upon click on link
       */
      toggleLanguageDropDown: function() {
        this.redirectToLink('/' + navigation.getPath());
        if($('#languagedropdown').hasClass('active')) {
          this.hideLanguageDropDown();  
        } else {
          this.showLanguageDropDown();
        }  
      }
    };
  }
);
