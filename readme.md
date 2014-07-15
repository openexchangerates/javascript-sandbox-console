# JavaScript Sandbox Console

![js sandbox console screenshot](https://raw.githubusercontent.com/openexchangerates/javascript-sandbox-console/master/demo-resources/img/js-sandbox-console.png)

a javascript playground to enhance demos and homepages for javascript libraries, plugins and scripts, giving visitors an easy and chilled-out way to test-drive functionality.

see the **[project homepage](http://openexchangerates.github.io/javascript-sandbox-console/)** for a live demo, features, installation guide and more info.

maintained by [Open Exchange Rates](https://openexchangerates.org) (see it in action on the **[money.js](http://openexchangerates.github.com/money.js)** homepage).


## Changelog

**0.2**
* Now maintained by Open Exchange Rates
* Improved documentation

**0.1.5**
* Added `setValue` method, to programmatically set the value inside the sandbox

**0.1.4**
* Added an `iframe` setting on the Sandbox Model that creates a hidden `iframe` and evaluates all commands inside its 'sandboxed' scope -  effectively blocking access to global variables.
* Added a script loader method `sandbox.model.load` to inject a script into the page (or the `iframe`).
* Added `:load` special command, available from the sandbox command line, to bootstrap any script into the global context (most useful in `iframe` mode. E.g.: `:load http://code.jquery.com/jquery-1.6.4.js`

**0.1.3**
* Added very basic stringification for objects. If `JSON.stringify(obj)` works, it prints the result, otherwise it's `obj.toString()`

**0.1.2**
* Mirrored gh-pages and master branches

**0.1.1**
* Added view.toEscaped() method to escape HTML strings for safe output templating

**0.1**
* First release
