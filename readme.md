# Online Web-based Deco Console

You should find this hosted on: http://deco-planner.archisgore.com/

The purpose of the tool is to have an online dive planning tool that combines all the open source things out there, to build a responsive, fast, efficient and install-free planning tool. You can share dive plans with others, and more importantly, you can script dive plans, to generate profiles difficult or cumbersome to generate manually.

Examples are adding many small segments to simulate a slope, or simulate curves. Or it could be running many different gas combinations to find which gasses work the best. Or it could be running different conservativism factors, to look at how conservativism affects the slope of deco.

This repo combines maby public-domain repos. The main reason behind this forked franken-repo is to provide an integration point for stuff that makes no sense in the individual repos on-it's-own (for instance browserifying a script in an npm repo looks ugly, or javascript-converting a python script, looks ugly and makes no sense there.)

First we start with a browserified (using the browserify tool) version of this Node.js module:
https://github.com/nyxtom/dive

This exposes the entire module in the browser (under a global object called dive, declared thus:)
var dive = require("/scuba-dive.js");

Secondly, there's a GUI built using AlloyUI (alloyyu.com), that allows you to construct dive plans graphically.

Third, these dive plans are converted into Javascript code, which is displayed in a syntax-highlighting editor, again provided by alloyUI (alloyui.com)

Finally there's a REPL-console to run individual commands, taken from: https://github.com/openexchangerates/javascript-sandbox-console

All the scripts are executed in your browser's main window object. So if you opened your developer tools and your own javascript console, you should be able to walk the entire object graph and use that if you'd like!

Here's a few examples on how to run a dive profile:

var buhlmannDeco = dive.deco.buhlmann();
var newPlan = new buhlmannDeco.plan(buhlmannDeco.ZH16ATissues); // 1 abs pressure in fresh water
newPlan.addBottomGas("2135", 0.21, 0.35);
newPlan.addDecoGas("50%", 0.5, 0.0);
newPlan.addDepthChange(0, 50, "2135", 5);
newPlan.addFlat(50, "2135", 25);
var decoPlan = plan.calculateDecompression(false, 0.2, 0.8, 1.6, 30); //gradientFactorLow = 0.2, gradientFactorHigh=0.8, deco ppO2 = 1.6, and max END allowed: 30 meters.

You can configure things like gradient factor, ppO2 exposure, and maximum END.

