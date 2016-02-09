Online Web-based Dive Planning
========================================================================

## Can I run it NOW?
You should find this hosted on: http://deco-planner.archisgore.com/

## What is this tool?
This is a tool meant for executing the **Buhlmann-GF** (*with Gradient Factors*) and ZHL tissues (A, B and C) and the **Variable Permeability Model** *B* (*VPM-B*) (*by Erik Baker*) algorithms in your browser. I have compared the numbers to GUE's Deco Planner and they are more or less identical (a couple of minutes difference here and there.)

The A, B, and C tissues in Buhlmann are used for different scenarios, I think - I could be wrong. I believe you use A tissues for computing NDLs. You use B tissues for Open Circuit (OC), and C tissues for CCRs (Closed Circuit Rebreathers.)

The VPM-B model is code picked up from Erik Baker's repository. I have not extensively tested it for comparison/accuracy. I will spend a lot of time with Deco Planner's VPM comparison as well as V Planner, to see how it compares/fares. The VPM implementation behind-the-scenes has support for just about every configuration imaginable. This tool hides it for brevity and for the "get it out to market" aspect. However, if you dig in, you can build complex and rich plans for CCRs with set-point ppO2s and different sizes for bubble nuclei, and just a whole host of things.

This tool requires no installation, and if you cloned the repo and opened the HTML file, it would open fine. Or you can find it hosted http://deco-planner.archisgore.com/.

The real power of this tool is:
* **Share, edit and modify dive plans**: because they are stored as programmatic statements. I can easily copy my program, and share it to my buddy, who can then edit or modify it, and send it back to me. This allows a collaborative back-and-forth dive plan to be generated.
* **Rapidly generate hundreds of dive plans**: with different profiles, or some small modification to study and compare. For instance you can quickly compare thousands of VPM vs Buhlmann dives by increasing bottom time by a minute at each step, and see when and HOW they begin to diverge.
* **Interactively study tissue loading**: You can add bottom time by one minute and then get tissue loads. Graph it, charge it, whatever. This allows you to understand how tissues load over time, and generate animations.
* **Figure out "corrections"**: for exceeding planned time or depth. I use this tool to generate my core plan, and then generate deco times for each 10 feet below planned depth, and each 5 minutes past planned time. It gives me a general "sense" of what and how the game changes. It tells me what my bottom line is (no pun intended.) So if I knew adding five minutes is going to increase deco time exponentially, I know where to add my focus.
* **Free and online**: You don't pay money for using it, but moreover, you don't have to install something. You can use it RIGHT NOW in your browser.
* **Open-source**: so you can study and understand WHAT is happening, and WHY it is making the decisions that it is. You are not beholden to a "trust-me" dive, which is arguably the worst type of dive, no matter where you stand on the philosophy and religion of diving.

## Examples!

### Buhlmann decompression profile
<pre>
var buhlmannDeco = dive.deco.buhlmann();
var newPlan = new buhlmannDeco.plan(buhlmannDeco.ZH16ATissues); // 1 abs pressure in fresh water
newPlan.addBottomGas("2135", 0.21, 0.35);
newPlan.addDecoGas("50%", 0.5, 0.0);
newPlan.addDepthChange(0, 50, "2135", 5);
newPlan.addFlat(50, "2135", 25);
var decoPlan = plan.calculateDecompression(false, 0.2, 0.8, 1.6, 30); //gradientFactorLow = 0.2, gradientFactorHigh=0.8, deco ppO2 = 1.6, and max END allowed: 30 meters.
</pre>

### VPM-B decompression profile

<pre>
var vpmDeco = dive.deco.vpm();
var newPlan = new vpm.plan(); // 1 abs pressure in fresh water
newPlan.addBottomGas("2135", 0.21, 0.35);
newPlan.addDecoGas("50%", 0.5, 0.0);
newPlan.addDepthChange(0, 50, "2135", 5);
newPlan.addFlat(50, "2135", 25);
var decoPlan = plan.calculateDecompression(false, 0.2, 0.8, 1.6, 30); //gradientFactorLow = 0.2, gradientFactorHigh=0.8, deco ppO2 = 1.6, and max END allowed: 30 meters.
</pre>


### Calculate the NDLs for different depths, on different gasses (No-deco limit)
<pre>
var buhlmann = dive.deco.buhlmann();
var newPlan = new buhlmann.plan(buhlmann.ZH16BTissues);
newPlan.addBottomGas("air", 0.21, 0.0);
var gradientFactor = 1.5; //This was choosen to closely match PADI dive tables.
newPlan.ndl(dive.feetToMeters(100), "air", gradientFactor);
</pre>

### Calculate NDL remaining (remaining No-Deco time)
<pre>
var buhlmann = dive.deco.buhlmann();
var newPlan = new buhlmann.plan(buhlmann.ZH16BTissues);
newPlan.addBottomGas("air", 0.21, 0.0);
var gradientFactor = 1.5; //This was choosen to closely match PADI dive tables.
newPlan.addDepthChange(0, 30, "air", 3); //went to 100 feet from surface in 3 minutes
newPlan.addFlat(30, "air", 10); //Stayed at 100 feet for 10 minutes
newPlan.ndl(dive.feetToMeters(100), "air", gradientFactor); //How long do I have left so I can surface without a mandatory deco obligation?
</pre>

You can configure things like gradient factor, ppO2 exposure, and maximum END.

## How it all works - the technical mumbo jumbo.

The purpose of the tool is to have an online dive planning tool that combines all the open source tools out there, to build a responsive, fast, efficient and install-free planning tool. You can share dive plans with others, and more importantly, you can script dive plans, to generate profiles difficult or cumbersome to generate manually.

This repo combines maby public-domain repos. The main reason behind this forked franken-repo is to provide an integration point for stuff that makes no sense in the individual repos on-it's-own (for instance browserifying a script in an npm repo looks ugly, or javascript-converting a python script, looks ugly and makes no sense there.)

First we start with a browserified (using the browserify tool) version of this Node.js module:
https://github.com/nyxtom/dive

This exposes the entire module in the browser (under a global object called dive, declared thus:)
var dive = require("/scuba-dive.js");

Secondly, there's a GUI built using AlloyUI (alloyyu.com), that allows you to construct dive plans graphically.

Third, these dive plans are converted into Javascript code, which is displayed in a syntax-highlighting editor, again provided by alloyUI (alloyui.com)

Finally there's a REPL-console to run individual commands, taken from: https://github.com/openexchangerates/javascript-sandbox-console

All the scripts are executed in your browser's main window object. So if you opened your developer tools and your own javascript console, you should be able to walk the entire object graph and use that if you'd like!
