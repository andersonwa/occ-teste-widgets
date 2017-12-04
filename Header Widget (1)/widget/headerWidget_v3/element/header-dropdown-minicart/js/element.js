define(
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['jquery', 'knockout', 'pubsub'],

  // -------------------------------------------------------------------
  // MODULE DEFINITION
  // -------------------------------------------------------------------
  function ($, ko, pubsub) {
    "use strict";

    return {
      elementName: 'header-dropdown-minicart',

      displayedMiniCartItems:    ko.observableArray(),
      currentSection:            ko.observable(1),
      totalSections:             ko.observable(),
      dropdowncartItemsHeight:   ko.observable(),
      gwpQualifiedMessage:       ko.observable(),

      onLoad: function(widget) {
        var self = this;

        if (widget.hasOwnProperty('miniCartNumberOfItems')) {

          //If miniCartNumberOfItems is not configured then default value is 3
          if (widget.miniCartNumberOfItems() === undefined) {
            widget.miniCartNumberOfItems(3);
          }

          widget.miniCartNumberOfItems(parseInt(widget.miniCartNumberOfItems()));

          // Changing height of .dropdowncartItems based on miniCartNumberOfItems
          widget.computeDropdowncartHeight = function() {
            var itemHeight = $("#CC-headerWidget #dropdowncart .item").css("height");
            if (itemHeight) {    //Converting height from string to integer
              itemHeight = itemHeight.split("p");
              itemHeight = parseInt(itemHeight[0]);
            } else {    // default height
                itemHeight = 80;
            }
            self.dropdowncartItemsHeight(widget.miniCartNumberOfItems() * itemHeight + 24);
            self.dropdowncartItemsHeight(self.dropdowncartItemsHeight()+"px");
          };

          /**
           *As grouping is done based on miniCartNumberOfItems() , this
           variable stores the maximum groups of miniCartNumberOfItems()
           items possible based on number of items in the cart.
           Currently miniCartNumberOfItems() has a value of 3
           */
          self.totalSections = ko.computed(function() {
            if (widget.cart().allItems().length == 0) {
              return 0;
            } else {
              return Math.ceil((widget.cart().allItems().length)/widget.miniCartNumberOfItems());
            }
          }, widget);

          // function to display items in miniCart array when scrolling down
          widget.miniCartScrollDown = function() {
            // Clear any timeout flag if it exists. This is to make sure that
            // there is no interruption while browsing cart.
            if (widget.cartOpenTimeout) {
              clearTimeout(widget.cartOpenTimeout);
            }
            self.currentSection(self.currentSection() + 1);
            widget.computeMiniCartItems();
            if (self.displayedMiniCartItems()[0]) {
              $("#CC-header-dropdown-minicart-image-"+self.displayedMiniCartItems()[0].productId+self.displayedMiniCartItems()[0].catRefId).focus();
            }
          };

          // function to display items in miniCart array when scrolling up
          widget.miniCartScrollUp = function() {
            // Clear any timeout flag if it exists. This is to make sure that
            // there is no interruption while browsing cart.
            if (widget.cartOpenTimeout) {
              clearTimeout(widget.cartOpenTimeout);
            }
            self.currentSection(self.currentSection() - 1);
            widget.computeMiniCartItems();
            if (self.displayedMiniCartItems()[0]) {
              $("#CC-header-dropdown-minicart-image-"+self.displayedMiniCartItems()[0].productId+self.displayedMiniCartItems()[0].catRefId).focus();
            }
          };

          // Re-populate displayedMiniCartItems array based on add/remove
          widget.computeMiniCartItems = function() {
            if (self.currentSection() <= self.totalSections()) {
              self.displayedMiniCartItems(widget.cart().allItems().slice((self.currentSection() - 1) * widget.miniCartNumberOfItems(), 
                  self.currentSection() * widget.miniCartNumberOfItems()));
            } else {
              if (self.totalSections()) {
                self.displayedMiniCartItems(widget.cart().allItems().slice((self.totalSections() - 1) * widget.miniCartNumberOfItems(), 
                    self.totalSections() * widget.miniCartNumberOfItems()));
                self.currentSection(self.totalSections());
              } else { // Mini-cart is empty, so initialize variables
                self.displayedMiniCartItems.removeAll();
                self.currentSection(1);
              }
            }
          };

          /**
           * Function that makes sure that the mini cart opens of, if set to
           * and goes to the particular product that has just been added to cart.
           */
          widget.goToProductInDropDownCart = function(product) {
            
            widget.computeMiniCartItems();
            
            var skuId = product.childSKUs[0].repositoryId;
            var cartItems = widget.cart().allItems();
            var itemNumber = -1;
            // Focus at start.
            $('.cc-cartlink-anchor').focus();
            if (widget.displayMiniCart()) {
              for (var i = 0; i < cartItems.length; i++) {
                if ((product.id == cartItems[i].productId) && (cartItems[i].catRefId == skuId)) {
                  itemNumber = i;
                  break;
                }
              }
              if (itemNumber > -1) {
                widget.showDropDownCart();
                // Move down the number of times given
                var prodPage = Math.floor(itemNumber / widget.miniCartNumberOfItems());
                var prodNum = itemNumber % widget.miniCartNumberOfItems();
                self.currentSection(prodPage + 1);
                widget.computeMiniCartItems();
                // Now focus on the product
                $("#CC-header-dropdown-minicart-image-"+product.id+skuId).focus();
                // Set the timeout if the item exists (should be there all the time.
                // Still a fallback).
                widget.cartOpenTimeout = setTimeout(function() {
                  widget.hideDropDownCart();
                  $('.cc-cartlink-anchor').focus();
                }, widget.miniCartDuration() * 1000);
              }
            }
          };
          
          $.Topic(pubsub.topicNames.CART_ADD_SUCCESS).subscribe(widget.goToProductInDropDownCart);
          $.Topic(pubsub.topicNames.CART_REMOVE_SUCCESS).subscribe(widget.computeMiniCartItems);
          $.Topic(pubsub.topicNames.CART_UPDATE_QUANTITY_SUCCESS).subscribe(widget.computeMiniCartItems);
          $.Topic(pubsub.topicNames.CART_UPDATED).subscribe(widget.computeMiniCartItems);
          $.Topic(pubsub.topicNames.GWP_QUALIFIED_MESSAGE).subscribe(function (message) {
            widget['header-dropdown-minicart'].gwpQualifiedMessage(message.summary);
          });
          $.Topic(pubsub.topicNames.GWP_CLEAR_QUALIFIED_MESSAGE).subscribe(function () {
            widget['header-dropdown-minicart'].gwpQualifiedMessage(null);
          });
          
        }
      }
    };
  }
);