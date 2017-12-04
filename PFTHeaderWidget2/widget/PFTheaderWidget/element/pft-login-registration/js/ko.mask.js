define(
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['jquery', 'knockout'],

  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------

  function ($, ko) {
    'use strict';

    return (ko.bindingHandlers.inputmask = {
      init: function (element, valueAccessor, allBindingsAccessor) {

        var mask = valueAccessor();

        var observable = mask.value;

        if (ko.isObservable(observable)) {

          $(element).on('focusout change', function () {

            if ($(element).inputmask('isComplete')) {
              observable($(element).val());
            } else {
              observable(null);
            }

          });
        }

        $(element).inputmask(mask);


      },
      update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        var mask = valueAccessor();

        var observable = mask.value;

        if (ko.isObservable(observable)) {

          var valuetoWrite = observable();

          $(element).val(valuetoWrite);
        }
      }

    });
  }
);
