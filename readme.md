# Online Web-based Deco Console

You should find this hosted on: http://deco-planner.archisgore.com/

This repo combines two public-domain repos. This excellent Javascript sandbox console: https://github.com/openexchangerates/javascript-sandbox-console

With a browserified version of this Node.js module:
https://github.com/nyxtom/dive

When you launch this website, you get an online command-line style REPL javascript console, to compute dive plans.

Here's a few examples on how to run a dive profile:

var buhlmannDeco = dive.deco.buhlmann();
var newPlan = new buhlmannDeco.plan(buhlmannDeco.ZH16ATissues); // 1 abs pressure in fresh water
newPlan.addBottomGas("2135", 0.21, 0.35);
newPlan.addDecoGas("50%", 0.5, 0.0);
newPlan.addDepthChange(0, 50, "2135", 5);
newPlan.addFlat(50, "2135", 25);
var decoPlan = plan.calculateDecompression(false, 0.2, 0.8, 1.6, 30); //gradientFactorLow = 0.2, gradientFactorHigh=0.8, deco ppO2 = 1.6, and max END allowed: 30 meters.

You can configure things like gradient factor, ppO2 exposure, and maximum END.

This tool is mainly intended to allow REPL-style dive planning, where you can add steps, remove steps, and compute plans programmatically. You can generate a large number of tables or validate multiple hypotheses rapidly.

## TODO

* Build a web-based GUI for this library so you have an online web-based deco-planner.
* Build a D3/SVG based grapher so we can graph rate-of-change-of-deco against different variables.
* Implement VPM in the root dive library.
