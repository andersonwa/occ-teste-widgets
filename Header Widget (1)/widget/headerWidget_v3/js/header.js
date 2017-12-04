/**
 * @fileoverview Header Widget.
 * 
 */
define(
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['knockout', 'pubsub', 'notifications', 'CCi18n', 'ccConstants', 'navigation', 
   'jquery', 'ccNumber'],
    
  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function (ko, pubsub, notifications, CCi18n, CCConstants, navigation, $, ccNumber) {
  
    "use strict";
        
    return {
      
      linkList:           ko.observableArray(),
      WIDGET_ID:          'header',

      // Keep track on whether the user should be able to see the cart.
      cartVisible:        ko.observable(false),
      ignoreBlur:         ko.observable(false),
      
      onLoad: function(widget) {
        var isMegaMenuExpanded = false;

        // save the links in an array for later
        widget.linkList.removeAll();

        for(var propertyName in widget.links()) {
         widget.linkList.push(widget.links()[propertyName]);
        }

        // compute function to create the text for the cart link  "0 items - $0.00" "1 item - $15.25" "2 items - $41.05"
        widget.cartLinkText = ko.computed(function() {
          var cartSubTotal, linkText, numItems; 
          var currencySymbol = widget.site().selectedPriceListGroup().currency.symbol;
          var cartSubTotal = widget.formatPrice(widget.cart().subTotal(), widget.site().selectedPriceListGroup().currency.fractionalDigits);
          if (currencySymbol.match(/^[0-9a-zA-Z]+$/)) {
            currencySymbol = currencySymbol + ' ';
          }
          numItems = widget.ccNumber(widget.cart().numberOfItems());
          // use the CCi18n to format the text avoiding concatination  "0 items - $0.00"
          // we need to get the currency symbol from the site currently set to a $
          linkText = CCi18n.t('ns.common:resources.cartDropDownText', 
              {count: widget.cart().numberOfItems(), formattedCount: numItems, currency: currencySymbol, totalPrice: cartSubTotal});
          return linkText;
        }, widget);
        var isiPad = navigator.userAgent.match(CCConstants.IPAD_STRING) != null;
        if (isiPad) {
          $(window).on('touchend', function(event) {
            if (!($(event.target).closest('#dropdowncart').length)) {
              //close the mini cart if clicked outside minicart
              $('#dropdowncart > .content').fadeOut('slow');
              $('#dropdowncart').removeClass('active');
            }
            if (!($(event.target).closest('#languagedropdown').length)) {
              //close the language picker if clicked outside language picker
              $('#languagedropdown > .content').fadeOut('slow');
              $('#languagedropdown').removeClass('active');
            }
            if (!($(event.target).closest('#CC-megaMenu').length)) {
              //close the mega menu if clicked outside mega menu
              $('li.cc-desktop-dropdown:hover > ul.dropdown-menu').css("display","none");
              isMegaMenuExpanded = false;
            }
            else {
              if ($(event.target).closest('a').next('ul').length === 0) {
                return true;
              }
              //for ipad, clicking on megaMenu should show the megaMenu drop down, clicking again will take to the category page
              if (!isMegaMenuExpanded && $(window).width() >= CCConstants.VIEWPORT_TABLET_UPPER_WIDTH) {
                isMegaMenuExpanded = true;
                return false;
              } else if (isMegaMenuExpanded && $(event.target).closest('a').attr('href') === navigation.getRelativePath()) {
                return false;
              } else {
                return true;
              }
            }
          });
        }
      },
      
      /**
       * key press event handle
       * 
       * data - knockout data 
       * event - event data
       */ 
      keypressHandler : function(data, event){

        var self, $this, keyCode;
        
        self = this; 
        $this = $(event.target);        
        keyCode = event.which ? event.which : event.keyCode;

        if (event.shiftKey && keyCode == CCConstants.KEY_CODE_TAB) {
          keyCode = CCConstants.KEY_CODE_SHIFT_TAB;
        }
        switch(keyCode) {
          case CCConstants.KEY_CODE_TAB:
            if (!($this[0].id === "CC-header-cart-total")) {
              this.handleCartClosedAnnouncement();
              $('#dropdowncart').removeClass('active');
            }
            break;            
            
          case CCConstants.KEY_CODE_SHIFT_TAB:
            if ($this[0].id === "CC-header-cart-total") {
              this.handleCartClosedAnnouncement();
              $('#dropdowncart').removeClass('active');
            }
        }
        return true;
      },
    
      showDropDownCart: function() {
        
        // Clear any previous timeout flag if it exists
        if (this.cartOpenTimeout) {
          clearTimeout(this.cartOpenTimeout);
        }
        
        // Tell the template its OK to display the cart.
        this.cartVisible(true);

        $('#CC-header-cart-total').attr('aria-label',CCi18n.t('ns.common:resources.miniCartOpenedText'));
        $('#CC-header-cart-empty').attr('aria-label',CCi18n.t('ns.common:resources.miniCartOpenedText'));

        notifications.emptyGrowlMessages();
        this.computeDropdowncartHeight();
        this['header-dropdown-minicart'].currentSection(1);
        this.computeMiniCartItems();
        $('#dropdowncart').addClass('active');
        $('#dropdowncart > .content').fadeIn('slow');
        
        var self=this;
        $(document).on('mouseleave','#dropdowncart', function() {
          self.handleCartClosedAnnouncement();
          $('#dropdowncart > .content').fadeOut('slow');
          $(this).removeClass('active');
        });

        // to handle the mouseout/mouseleave events for ipad for mini-cart
        var isiPad = navigator.userAgent.match(CCConstants.IPAD_STRING) != null;
        if (isiPad) {
          $(document).on('touchend', function(event) {
            if (!($(event.target).closest('#dropdowncart').length)) {
              self.handleCartClosedAnnouncement();
              $('#dropdowncart > .content').fadeOut('slow');
              $('#dropdowncart').removeClass('active');
            }
          });   
        }
      },

      hideDropDownCart: function() {
        // Tell the template the cart should no longer be visible.
        this.cartVisible(false);

        $('#CC-header-cart-total').attr('aria-label',CCi18n.t('ns.common:resources.miniCartClosedText'));
        $('#CC-header-cart-empty').attr('aria-label',CCi18n.t('ns.common:resources.miniCartClosedText'));
        setTimeout(function(){
          $('#CC-header-cart-total').attr('aria-label',CCi18n.t('ns.header:resources.miniShoppingCartTitle'));
          $('#CC-header-cart-empty').attr('aria-label',CCi18n.t('ns.header:resources.miniShoppingCartTitle'));
        },1000);

        $('#dropdowncart > .content').fadeOut('slow');
        $('#dropdowncart').removeClass('active');
        
        // Clear the timeout flag if it exists
        if (this.cartOpenTimeout) {
          clearTimeout(this.cartOpenTimeout);
        }
        
        return true;
      },
      
      toggleDropDownCart: function() {

        if($('#dropdowncart').hasClass('active')) {
          this.hideDropDownCart();  
        } else {
          this.showDropDownCart();
        }  
      },
      
      // Sends a message to the cart to remove this product
      handleRemoveFromCart: function() {

        $.Topic(pubsub.topicNames.CART_REMOVE).publishWith(
            this.productData(),[{"message":"success", "commerceItemId": this.commerceItemId}]);
      },

      // Sends a message to the cart to remove this placeholder
      handlePlaceHolderRemove: function() {
        $.Topic(pubsub.topicNames.PLACE_HOLDER_REMOVE).publish(this);
      },

      /**
       * validate the cart items stock status as per the quantity. base on the 
       * stock status of cart items redirect to checkout or cart
       */
      handleValidateCart: function(data, event) {
        // returns if the profile has unsaved changes.
        if (data.user().isUserProfileEdited()) {
          return true;
        }
        data.cart().validatePrice = true;
        if (navigation.getRelativePath() == data.links().cart.route) {
          data.cart().skipPriceChange(true);
        }        
        $.Topic(pubsub.topicNames.LOAD_CHECKOUT).publishWith(data.cart(), [{message: "success"}]);
      },
      
      handleDropDownCheckout: function(data, event) {
        this.hideDropDownCart();
        this.handleValidateCart(data, event);
      },
      
      /**
       * Invoked to skip the repetitive navigation for assistive technologies
      */
      skipToContentHandler: function() {
        var id = $("#region-navbar").attr("id");
        if(!id) {
          id = $("#region-megaMenu").next().attr("id");
          if( (typeof id === "undefined") || (id === null) ) {
            id = $("#region-header").next().attr("id");
          }
        }
        else {
          id = $("#region-navbar").next().attr("id");
        }
        var idGen="#"+id+" :focusable";
        $(idGen).first().focus(); 
      },
      
      /**
       * Process the Nr parameter by removing product.priceListPair or product.language
       */
      processNrParameter : function(data, source) {
        if (data.indexOf('(') === -1) {
          return data;
        }
        var rightToken = data.split('(')[1];
        var parseString = rightToken.split(')')[0];
        var tokenizedKeys = parseString.split(',');
        var finalString = '';
        for (var i = 0; i < tokenizedKeys.length; i++) {
          if (tokenizedKeys[i].indexOf('product.priceListPair') !== -1 && source === 'currency-picker') {
            continue;
          } else if (tokenizedKeys[i].indexOf('product.language') !== -1 && source === 'language-picker') {
            continue;
          }
          if (finalString === '') {
            finalString = tokenizedKeys[i];
          } else {
            finalString = finalString + "," + tokenizedKeys[i]; 
          }
        }
        finalString = data.split('(')[0] + '(' + finalString;
        finalString = finalString + ')' + data.split(')')[1];
        return finalString;
      },

      /**
       * Hand the aria announcement when the minicart is closed
       */
      handleCartClosedAnnouncement: function() {
        if($('#dropdowncart').hasClass('active')) {
          $('#alert-modal-change').text(CCi18n.t('ns.common:resources.miniCartClosedText'));
          $('#CC-header-cart-total').attr('aria-label',CCi18n.t('ns.header:resources.miniShoppingCartTitle'));
          $('#CC-header-cart-empty').attr('aria-label',CCi18n.t('ns.header:resources.miniShoppingCartTitle'));
        }
      }
    };
  }
);
