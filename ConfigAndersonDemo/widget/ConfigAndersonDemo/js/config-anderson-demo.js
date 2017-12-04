define(

  ['knockout', 'jquery'],

  function(ko, $) {
    "use strict";

    return {
      onLoad: function (widget) {
        widget.showCartMsg = ko.computed(function() {
          return (widget.user().loggedIn() &&
                  widget.cart().numberOfItems() > 0 &&
                  widget.cart().total() < widget.minSpend());
        });

        widget.cartMsg = ko.computed(function() {
          return widget.translate('cartMsg',
          { currencySymbol: widget.site().currency.symbol,
            cartTotal: widget.cart().total(), minSpend: widget.minSpend(),
            coupon: widget.coupon() });
        });
      },

      sizeBanner: function(widget) {
        if (widget.bannerSize() === 's') {
          $('.stitched').css({'padding': '20px'});
        }
        else if (widget.bannerSize() === 'm') {
          $('.stitched').css({'padding': '40px 20px 40px 20px'});
        }
        else if (widget.bannerSize() === 'l') {
          $('.stitched').css({'padding': '80px 20px 80px 20px'});
        }
      }
    }
  }
)
