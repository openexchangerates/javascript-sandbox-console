# JavaScript Sandbox Console

![js sandbox console screenshot](http://www.josscrowcroft.com/wp-content/uploads/2011/10/js-sandbox-console.png)

The **[js sandbox console](http://josscrowcroft.github.com/javascript-sandbox-console/)** is a javascript playground designed to enhance demos and homepages for javascript libraries, plugins and scripts, giving visitors an easy and chilled-out way to test-drive the functionality - without whacking open their Firebug / Dev Tools console.

## Live demo and such:

**&rarr;** Check out the **[project homepage](http://josscrowcroft.github.com/javascript-sandbox-console/)** for a live demo, installation guide and more info!

by **[joss](http://www.josscrowcroft.com)**


## Changelog

### 0.1.3
* Added very basic stringification for objects. If `JSON.stringify(obj)` works, it prints the result, otherwise it's `obj.toString()` like a loser. Soon try to integrate a custom solution like in jsconsole.com, that includes circular structures, native/browser objects, and object methods.

### 0.1.2
* Mirrored gh-pages and master, much easier than trying to maintain both separately.

### 0.1.1
* Added view.toEscaped method to escape HTML strings so that they can be safely templated into the output

#### 0.1
* First release