/*
 * dive
 * https://github.com/nyxtom/dive
 *
 * Copyright (c) 2013 Thomas Holloway
 * Licensed under the MIT license.
 */

(function () {
    // Initial setup
    // --------------

    // save a reference to the global object
    var root = this;

    // the top-level namespace. All public `dive` classes and modules will 
    // be attached to this. Exported for both CommonJS and the browser
    var dive, $self;
    if (typeof exports !== 'undefined') {
        $self = dive = exports;
    } else {
        $self = dive = root.dive || {};
    }

    // current version of the library
    $self.VERSION = '0.1.1';

    /*
     * The effect of pressure and temperature on the densities of liquids 
     * and solids is small. The compressibility for a typical liquid or 
     * solid is 10−6 bar−1 (1 bar = 0.1 MPa) and a typical thermal 
     * expansivity is 10−5 K−1. This roughly translates into needing 
     * around ten thousand times atmospheric pressure to reduce the 
     * volume of a substance by one percent. (Although the pressures 
     * needed may be around a thousand times smaller for sandy soil 
     * and some clays.) A one percent expansion of volume typically 
     * requires a temperature increase on the order of thousands of degrees Celsius.
     */
    // current liquid sample density in kilogram per cubic meters (kg/m3) or grams per cubic centimeters (g/cm3)
    $self.liquidSamples = {
        fresh: {
            density: function () {
                return $self.density(1000, 1); // 1000kg / m3 at 0C / 32F (standard conditions for measurements)
            }
        },
        salt: {
            density: function () {
                return $self.density(1030, 1); // 1000kg / m3 at 0C / 32F (standard conditions for measurements)
            }
        },
        mercury: {
            density: function () {
                return $self.density(13595.1, 1); // 13595.1 kg / m3 at 0C / 32F (standard conditions)
            }
        }
    };

    // current gravity sample rates in meters per second per second (m/s2)
    $self.gravitySamples = {
        earth: 9.80665,
        _current: 9.80665,
        current: function (_value) {
            if (typeof _value == 'number') {
                $self.gravitySamples._current = _value;
            }
            return $self.gravitySamples._current;
        }
    };

    // current surface pressure measured in bar
    $self.surfacePressureSamples = {
        earth: 1,
        _current: 1,
        current: function (_value) {
            if (typeof _value == 'number') {
                $self.surfacePressureSamples._current = _value;
            }
            return $self.surfacePressureSamples._current;
        }
    };

    $self.constants = {
        vapourPressure: {
            water: {
                tempRange_1_100: [8.07131,1730.63,233.426],
                tempRange_99_374: [8.14019,1810.94,244,485]
            },
            lungsBreathing: {
                _current: null,
                current: function() {
                    if (!$self.constants.vapourPressure.lungsBreathing._current) {
                        var value = $self.waterVapourPressureInBars(35.2);
                        $self.constants.vapourPressure.lungsBreathing._current = value;
                    }
                    return $self.constants.vapourPressure.lungsBreathing._current;
                }
            }
        },
        altitudePressure: {
            sealevel: 1,
            _current: 1,
            current: function (_value) {
                if (typeof _value == 'number') {
                    $self.constants.altitudePressure._current = _value;
                }
                return $self.constants.altitudePressure._current;
            }
        }
    };

    $self.feetToMeters = function (feet) {
        /// <summary>Calculates standard feet to meters calculation.</summary>
        /// <param name="feet" type="Number">Number of feet to convert.</param>
        /// <returns>The number in meters.</returns>
        if (!feet)
            return 0.3048;

        return feet * 0.3048;
    };

    $self.metersToFeet = function (meters) {
        /// <summary>Calculates standard meters to feet calculation.</summary>
        /// <param name="meters" type="Number">Number of meters to convert.</param>
        /// <returns>The number in feet.</returns>
        if (!meters)
            return 3.28084;

        return meters * 3.28084;
    };

    $self.mmHgToPascal = function (mmHg) {
        /// <summary>Returns the definition of mmHg (millimeters mercury) in terms of Pascal.</summary>
        /// <param name="mmHg" type="Number">Millimeters high or depth.</param>
        /// <returns>Typically defined as weight density of mercury</returns>
        
        if (!mmHg) {
            mmHg = 1;
        }

        return ($self.liquidSamples.mercury.density() / 1000) * $self.gravitySamples.current() * mmHg;
    };

    $self.pascalToBar = function (pascals) {
        /// <summary>Calculates the pascal to bar derived unit.</summary>
        /// <param name="pascal" type="Number">The pascal SI derived unit.</param>
        /// <returns>Bar derived unit of pressure from pascal</returns>

        // 100000 pascals = 1 bar
        return pascals / ($self.surfacePressureSamples.current() * 100000);
    };

    $self.barToPascal = function (bars) {
        /// <summary>Calculates the bar to pascal derived unit.</summary>
        /// <param name="bars" type="Number">The bar derived unit.</param>
        /// <returns>Pascal derived unit of pressure from bars</returns>
        
        if (!bars) {
            bars = 1;
        }

        // 100000 pascals = 1 bar
        return bars * ($self.surfacePressureSamples.current() * 100000);
    };

    $self.atmToBar = function (atm) {
        /// <summary>Calculates the internal pressure (measure of force per unit area) - often 
        /// defined as one newton per square meter.</summary>
        /// <param name="atm" type="Number">The number of atmospheres (atm) to conver.</param>
        /// <returns>Bar dervied unit of pressure from atm.</returns>

        var pascals = $self.atmToPascal(atm);
        return $self.pascalToBar(pascals);
    };

    $self.atmToPascal = function (atm) {
        /// <summary>Calculates the internal pressure (measure of force per unit area) - often
        /// defined as one newton per square meter.</summary>
        /// <param name="atm" type="Number">The number of atmospheres (atm) to conver.</param>
        /// <returns>Pascal SI dervied unit of pressure from atm.</returns>
        
        // atm is represented as the force per unit area exerted on a surface by the weight of the 
        // air above that surface in the atmosphere. The unit of measurement on Earth is typically
        // 101325 pascals = 1 atm. 
        // 100000 pascals = 1 bar
        // 
        // On Jupiter (since there isn't technically a surface, the base is determined to be at about 10bars) or 
        // 10 times the surface pressure on earth. It's funny how easy it is to use bar since you can essentially 
        // say how much times the surface pressure on earth is X. Easy conversion.
        //
        // Interesting enough, according to http://en.wikipedia.org/wiki/Bar_(unit)#Definition_and_conversion
        // atm is a deprecated unit of measurement. Despite the fact that bars are not a standard unit of 
        // measurement, meterologists and weather reporters worldwide have long measured air pressure in millibars
        // as the values are convenient. After hPa (hectopascals) were setup, meterologists often use hPa which 
        // are numerically equivalent to millibars. (i.e. 1hPa = 1mbar = 100Pa).
        //
        // Given the case for Mars, which averages about 600 Pascals = 6hPa = 6mbar
        // That means that the surface pressure on mars is roughly 166 times weaker than 
        // the surface pressure on Earth. Given that Mars's gravity is roughly 3.724m/s2.
        // Which means if you had fresh water on Mars (380kg/m3 accounting for density)
        // the weight density of water on mars would be 1415.12 N/m3. Given 600 Pascals = 600 N/m2.
        // You could dive (if fresh water existed on mars to a reasonanly depth), to reach the level
        // of pressure that you would experience typically at 10 meters here on Earth you would have to 
        // dive up to 35.191361896 meters or about 115.457 feet.
        //
        // (Please tell me if I'm calculating this wrong, it seems about accurate to me)
        //

        // See also: https://twitter.com/nyxtom/status/296157625123500032
        // Essentially, thoughts that pondered on how Jupiter's gravitational pull would 
        // affect the atmospheric pressure underwater for the moons surrounding it (that essentially made of ice and potentially 
        // other water based liquid forms). http://www.planetaryexploration.net/jupiter/io/tidal_heating.html

        // atm is essentially a deprecated unit of measurement
        if (!atm) {
            atm = 1;
        }

        // 100000 pascal = 1 bar = 0.986923267 atm
        // 1 atm = 101325 pascal = 1.01325 bar
        return $self.surfacePressureSamples.current() * 101325 * atm;
    };

    $self.pascalToAtm = function (pascal) {
        /// <summary>Converts pascal to atm.</summary>
        /// <param type="pascal" type="Number">The pascal unit to convert.</param>
        /// <returns>The atmospheric pressure from pascal SI derived unit.<returns>

        return pascal / ($self.surfacePressureSamples.current() * 101325);
    };

    $self.density = function (weight, volume) {
        /// <summary>Calculates the liquid density of the mass for the given volume.</summary>
        /// <param name="weight" type="Number">The weight (in kilograms) of the given mass.</param>
        /// <param name="volume" type="Number">The volume of the given mass in (cubic meters m3).</param>
        /// <returns>Density of the mass</returns>

        return weight / volume;
    };

    $self.depthInMetersToBars  = function (depth, isFreshWater) {
        /// <summary>Calculates the absolute pressure (in bars) for 1 cubic meter of water for the given depth (meters).</summary>
        /// <param name="depth" type="Number">The depth in meters below the surface for 1 cubic meter volume of water.</param>
        /// <param name="isFreshWater" type="Boolean">True to calculate against the weight density of fresh water versus salt.</param>
        /// <returns>The absolute pressure (in bars) for the given depth (in meters) of 1 cubic meter volume of water below the surface.</returns>
        
        var liquidDensity;
        if (isFreshWater) {
            liquidDensity = $self.liquidSamples.fresh.density();
        } else {
            liquidDensity = $self.liquidSamples.salt.density();
        }

        var weightDensity = liquidDensity * $self.gravitySamples.current();
        return $self.pascalToBar((depth * weightDensity)) + $self.constants.altitudePressure.current();
    };

    $self.depthInMetersToAtm  = function (depth, isFreshWater) {
        /// <summary>Calculates the absolute pressure (in atm) 1 cubic meter of water for the given depth (meters).</summary>
        /// <param name="depth" type="Number">The depth in meters below the surface for 1 cubic meter volume of water.</param>
        /// <param name="isFreshWater" type="Boolean">True to calculate against the weight density of fresh water versus salt.</param>
        /// <returns>The absolute pressure (in atm) for the given depth (in meters) of 1 cubic meter volume of water below the surface.</returns>
        
        var liquidDensity;
        if (isFreshWater) {
            liquidDensity = $self.liquidSamples.fresh.density();
        } else {
            liquidDensity = $self.liquidSamples.salt.density();
        }

        var weightDensity = liquidDensity * $self.gravitySamples.current();
        return $self.pascalToAtm((depth * weightDensity)) + $self.constants.altitudePressure.current();
    };

    $self.barToDepthInMeters = function (bars, isFreshWater) {
        /// <summary>Calculates the depth (in meters) for the given atmosphere (bar).</summary>
        /// <param name="bars" type="Number">The number of atmospheric pressure (in bars) to convert.</param>
        /// <param name="isFreshWater" type="Boolean">True to calculate against the weight density of fresh water versus salt.</param>
        /// <returns>The depth (in meters) for the given number of atmospheres.</returns>

        var liquidDensity;
        if (isFreshWater) {
            liquidDensity = $self.liquidSamples.fresh.density();
        } else {
            liquidDensity = $self.liquidSamples.salt.density();
        }

        if (!bars) {
            bars = 1; //surface
        }

        bars = bars - $self.constants.altitudePressure.current();

        var weightDensity = liquidDensity * $self.gravitySamples.current();
        var pressure = $self.barToPascal(bars)
        return pressure / weightDensity;
    };

    $self.atmToDepthInMeters = function (atm, isFreshWater) {
        /// <summary>Calculates the depth (in meters) for the given atmosphere (atm).</summary>
        /// <param name="atm" type="Number">The number of atmospheres (atm) to convert.</param>
        /// <param name="isFreshWater" type="Boolean">True to calculate against the weight density of fresh water versus salt.</param>
        /// <returns>The depth (in meters) for the given number of atmospheres.</returns>

        /*
         * Liquid pressure is defined as: pgh (density of liquid x gravity at the surface x height).
         * or Pressure = weight density x depth
         *
         * Standard Weight Density: (kg/m3) at 32F or 0C
         *  Water (fresh): 1000 kg/m3
         *  Water (salt): 1030 kg/m3
         *
         * since there is always 1atm (above water)
         *  
         *  P = depth x weight density + 1P atm
         *  
         *  So to calculate the depth under liquid at which pressure is 2x atm,
         *
         *  depth x weight density + atm pressure (P) = 2 atm
         *  depth = 1P atm / weight density
         *
         *  weight density = density x gravity
         *  1 ATM = 101,325 Pa
         *  
         *  weight density of water (fresh) at 0C = 1000 kg/m3 x 9.8m/s2
         *
         *  depth = 101325 Pa / (1000 kg/m3 x 9.8m/s2)
         *  1 newton = kg*m/s2
         *  1 pascal = 1 newton / m2
         *
         *  
         *  101325 newton per m2 / (9800 kg*m/m3*s2)
         *  9800 kg*m/m3*s2 = 9800 newton per m3
         *
         *  101325 N/m2 / 9800 N/m3 = 10.339285714 meters
         */

        var liquidDensity;
        if (isFreshWater) {
            liquidDensity = $self.liquidSamples.fresh.density();
        } else {
            liquidDensity = $self.liquidSamples.salt.density();
        }

        if (!atm) {
            atm = 1;
        }

        var weightDensity = liquidDensity * $self.gravitySamples.current();
        var pressure = $self.atmToPascal(atm);
        return pressure / weightDensity;
    };

    $self.dac = function (psiIn, psiOut, runTime) {
        /// <summary>Calculates depth air consumption rate in psi/min.</summary>
        /// <param name="psiIn" type="Number">Pounds/square inch that one starts their dive with.</param>
        /// <param name="psiOut" type="Number">Pounds/square inch that one ends their dive with.</param>
        /// <param name="runTime" type="Number">The total time (in minutes) of a given dive.</param>
        /// <returns>The depth air consumption (DAC) rate in psi/min for the given psi in/out and dive time in minutes.</returns>

        return ((psiIn - psiOut) / runTime);
    };

    $self.sac = function (dac, avgDepth, isFreshWater) {
        /// <summary>Calculates surface air consumption rate in psi/min based on DAC (depth air consumption) rate.</summary>
        /// <param name="dac" type="Number">Depth air consumption rate in psi/min.</param>
        /// <param name="avgDepth" type="Number">Average depth (in meters) for length of dive.</param>
        /// <param name="isFreshWater" type="Boolean">True to calculate for fresh water rates, false or undefined for salt water.</param>
        /// <returns>The surface air consumption (SAC) rate in psi/min for the given DAC and average depth.</returns>

        var depthToOneATM = $self.atmToDepthInMeters(1, isFreshWater);
        return (dac / ((avgDepth / depthToOneATM) + 1));
    };

    $self.rmv = function (sac, tankVolume, workingTankPsi) {
        /// <summary>Calculates the respiratory minute volume rate in ft^3/min based on SAC (surface air consumption) rate.</summary>
        /// <param name="sac" type="Number">Surface air consumption rate in psi/min.</param>
        /// <param name="tankVolume" type="Number">Tank volume in cubic feet (typically 80ft^3 or 100ft^3).</param>
        /// <param name="workingTankPsi" type="Number">The working pressure in psi for the given tank (typically stamped on the tank neck).</param>
        /// <returns>The respiratory minute volume rate (RMV) in cubic feet / minute.</returns>

        var tankConversionFactor = tankVolume / workingTankPsi;
        return sac * tankConversionFactor;
    };

    $self.partialPressure = function (absPressure, volumeFraction) {
        /// <summary>Calculates the partial pressure of a gas component from the volume gas fraction and total pressure.</summary>
        /// <param name="absPressure" type="Number">The total pressure P in bars (typically 1 bar of atmospheric pressure + x bars of water pressure).</param>
        /// <param name="volumeFraction" type="Number">The volume fraction of gas component (typically 0.79 for 79%) measured as percentage in decimal.</param>
        /// <returns>The partial pressure of gas component in bar absolute.</returns>
        
        return absPressure * volumeFraction;
    };

    $self.partialPressureAtDepth = function (depth, volumeFraction, isFreshWater) {
        /// <summary>Calculates the partial pressure of a gas component from the volume gas fraction and total pressure from depth in meters.</summary>
        /// <param name="depth" type="Number">The depth in meters below sea level.</param>
        /// <param name="volumeFraction" type="Number">The volume fraction of gas component (typically 0.79 for 79%) measured as percentage in decimal.</param>
        /// <param name="isFreshWater" type="Boolean">True to calculate against the weight density of fresh water versus salt.</param>
        /// <returns>The partial pressure of gas component in bar absolute.</returns>

        var p = $self.depthInMetersToBars(depth, isFreshWater);
        return p * volumeFraction;
    };

    $self.waterVapourPressure = function (degreesCelcius) {
        /// <summary>The vapour pressure of water may be approximated as a function of temperature.</summary>
        /// <param name="temp" type="Number">The temperature to approximate the pressure of water vapour.</param>
        /// <returns>Water vapour pressure in terms of mmHg.</returns>

        /* Based on the Antoine_equation http://en.wikipedia.org/wiki/Antoine_equation */
        /* http://en.wikipedia.org/wiki/Vapour_pressure_of_water */
        var rangeConstants;
        if (degreesCelcius >= 1 && degreesCelcius <= 100)
            rangeConstants = $self.constants.vapourPressure.water.tempRange_1_100;
        else if (degreesCelcius >= 99 && degreesCelcius <= 374)
            rangeConstants = $self.constants.vapourPressure.water.tempRange_99_374;
        else
            return NaN;

        var logp = rangeConstants[0] - (rangeConstants[1] / (rangeConstants[2] + degreesCelcius));
        return Math.pow(10, logp);
    };

    $self.waterVapourPressureInBars = function (degreesCelcius) {
        /// <summary>The vapour pressure of water may be approximated as a function of temperature.</summary>
        /// <param name="temp" type="Number">The temperature to approximate the pressure of water vapour.</param>
        /// <returns>Water vapour pressure in terms of bars.</returns>
        
        var mmHg = $self.waterVapourPressure(degreesCelcius);
        var pascals = $self.mmHgToPascal(mmHg);
        return $self.pascalToBar(pascals);
    };

    $self.depthChangeInBarsPerMinute = function (beginDepth, endDepth, time, isFreshWater) {
        /// <summary>Calculates the depth change speed in bars per minute.</summary>
        /// <param name="beginDepth" type="Number">The begin depth in meters.</param>
        /// <param name="endDepth" type="Number">The end depth in meters.</param>
        /// <param name="time" type="Number">The time that lapsed during the depth change in minutes.</param>
        /// <param name="isFreshWater" type="Boolean">True to calculate changes in depth while in fresh water, false for salt water.</param>
        /// <returns>The depth change in bars per minute.</returns>
        
        var speed = (endDepth - beginDepth) / time;
        return $self.depthInMetersToBars(speed, isFreshWater) - $self.constants.altitudePressure.current();
    };

    $self.gasRateInBarsPerMinute = function (beginDepth, endDepth, time, fGas, isFreshWater) {
        /// <summary>Calculates the gas loading rate for the given depth change in terms of bars inert gas.</summary>
        /// <param name="beginDepth" type="Number">The starting depth in meters.</param>
        /// <param name="endDepth" type="Number">The end depth in meters.</param>
        /// <param name="time" type="Number">The time in minutes that lapsed between the begin and end depths.</param>
        /// <param name="fGas" type="Number">The fraction of gas to calculate for.</param>
        /// <param name="isFreshWater" type="Boolean">True to calculate changes in depth while in fresh water, false for salt water.</param>
        /// <returns>The gas loading rate in bars times the fraction of inert gas.</param>
        
        return Math.abs($self.depthChangeInBarsPerMinute(beginDepth, endDepth, time, isFreshWater)) * fGas;
    };

    $self.gasPressureBreathingInBars = function (depth, fGas, isFreshWater) {
        /// <summary>Calculates the approximate pressure of the fraction of gas for each breath taken.</summary>
        /// <param name="depth" type="Number">The depth in meters.</param>
        /// <param name="fGas" type="Number">The fraction of the gas taken in.</param>
        /// <param name="isFreshWater" type="Boolean">True to calculate changes while in fresh water, false for salt water.</param>
        /// <returns>The gas pressure in bars taken in with each breath (accounting for water vapour pressure in the lungs).</returns>

        var bars = $self.depthInMetersToBars(depth, isFreshWater);
        //bars = bars - $self.constants.altitudePressure.current() - $self.constants.vapourPressure.lungsBreathing.current();
        //console.log("Depth:"+ depth + ", bars:" + bars + " fGas:" + fGas + ", ppGas:" + (bars*fGas));
        return bars * fGas;
    };

    $self.instantaneousEquation = function (pBegin, pGas, time, halfTime) {
        /// <summary>Calculates the compartment inert gas pressure.</summary>
        /// <param name="pBegin" type="Number">Initial compartment inert gas pressure.</param>
        /// <param name="pGas" type="Number">Partial pressure of inspired inert gas.</param>
        /// <param name="time" type="Number">Time of exposure or interval.</param>
        /// <param name="halfTime" type="Number">Half time of the given gas exposure.</param>
        /// <returns>Approximate pressure of a given gas over the exposure rate and half time.</returns>

        //return schreiner equation with rate of change zero - indicating constant depth
        //var instantLoad = (pBegin + (pGas - pBegin) * (1 - Math.pow(2, (-time/halfTime))));
        var slopeLoad = this.schreinerEquation(pBegin, pGas, time, halfTime, 0);
        //if (instantLoad < slopeLoad) {
        //    console.log("InstandLoad: " + instantLoad + ", SlopeLoad:" + slopeLoad);
        //}
        return slopeLoad;
    };

    $self.schreinerEquation = function (pBegin, pGas, time, halfTime, gasRate) {
        /// <summary>Calculates the end compartment inert gas pressure in bar.</summary>
        /// <param name="gasRate" type="Number">Rate of descent/ascent in bar times the fraction of inert gas.</param>
        /// <param name="time" type="Number">Time of exposure or interval in minutes.</param>
        /// <param name="timeConstant" type="Number">Log2/half-time in minute.</param>
        /// <param name="pGas" type="Number">Partial pressure of inert gas at CURRENT depth (not target depth - but starting depth where change begins.)</param>
        /// <param name="pBegin" type="Number">Initial compartment inert gas pressure.</param>
        /// <returns>The end compartment inert gas pressure in bar.</returns>
        var timeConstant = Math.log(2)/halfTime
        return (pGas + (gasRate * (time - (1.0/timeConstant))) - ((pGas - pBegin - (gasRate / timeConstant)) * Math.exp(-timeConstant * time)));
    };

    $self.gas = function(fO2, fHe) {
        var gas = {};
        gas.fO2 = fO2;
        gas.fHe = fHe;
        gas.fN2 = (1 - (gas.fO2 + gas.fHe));

        gas.modInMeters = function(ppO2, isFreshWater) {
            return $self.barToDepthInMeters(ppO2 / this.fO2, isFreshWater);
        };

        gas.endInMeters = function(depth, isFreshWater) {

            // Helium has a narc factor of 0 while N2 and O2 have a narc factor of 1
            var narcIndex = (this.fO2) + (this.fN2);

            var bars = $self.depthInMetersToBars(depth, isFreshWater);
            var equivalentBars = bars * narcIndex;
            //console.log("Depth: " + depth + " Bars:" + bars + "Relation: " + narcIndex + " Equivalent Bars:" +equivalentBars);
            return  $self.barToDepthInMeters(equivalentBars, isFreshWater);
        };

        gas.eadInMeters = function(depth, isFreshWater) {

            // Helium has a narc factor of 0 while N2 and O2 have a narc factor of 1
            var narcIndex = (this.fO2) + (this.fN2);

            var bars = $self.depthInMetersToBars(depth, isFreshWater);
            var equivalentBars = bars/narcIndex;
            //console.log("Depth: " + depth + " Bars:" + bars + "Relation: " + narcIndex + " Equivalent Bars:" +equivalentBars);
            return  $self.barToDepthInMeters(equivalentBars, isFreshWater);
        };

        return gas;
    };

    $self.segment = function(startDepth, endDepth, gasName, time) {
        var segment = {};
        segment.gasName = gasName;
        segment.startDepth = startDepth;
        segment.endDepth = endDepth;
        segment.time = time;

        return segment;
    };

    //In a single pass, collapses adjacent flat segments together.
    $self.collapseSegments = function (segments) {
        var collapsed = true;
        while (collapsed) {
            collapsed = false;
            for (var i = 0; i < segments.length-1; i++) {
                var segment1 = segments[i];
                var segment2 = segments[i+1];
                //if both are flat and match the same depth
                if (segment1.startDepth == segment1.endDepth &&
                    segment2.startDepth == segment2.endDepth &&
                    segment1.endDepth == segment2.startDepth &&
                    segment1.gasName == segment2.gasName) {

                    segment1.time = segment1.time + segment2.time;
                    segments.splice(i+1, 1); //remove segment i+1
                    collapsed = true;
                    break; //the indexes are all messed up now.

                }
            }

        }

        return segments;

    };
}).call(this);

(function () {
    // save a reference to the global object
    var root = this;

    // the top-level namespace. All public `dive` classes and modules will 
    // be attached to this. Exported for both CommonJS and the browser
    var dive, $self;
    if (typeof exports !== 'undefined') {
        dive = exports;
    } else {
        dive = root.dive || {};
    }

    $self = dive.deco = dive.deco || {};

    $self.buhlmann = function() {
        var algorithm = {};
        algorithm.ZH16ATissues = [
            // N2HalfTime, N2AValue, N2BValue, HeHalfTime, HeAValue, HeBValue
            [4.0, 1.2599, 0.5050, 1.51, 1.7424, 0.4245],
            [5.0, 1.2599, 0.5050, 1.88, 1.6189, 0.4770],
            [8.0, 1.0000, 0.6514, 3.02, 1.3830, 0.5747],
            [12.5, 0.8618, 0.7222, 4.72, 1.1919, 0.6527],
            [18.5, 0.7562, 0.7725, 6.99, 1.0458, 0.7223],
            [27.0, 0.6667, 0.8125, 10.21, 0.9220, 0.7582],
            [38.3, 0.5933, 0.8434, 14.48, 0.8205, 0.7957],
            [54.3, 0.5282, 0.8693, 20.53, 0.7305, 0.8279],
            [77.0, 0.4701, 0.8910, 29.11, 0.6502, 0.8553],
            [109.0, 0.4187, 0.9092, 41.20, 0.5950, 0.8757],
            [146.0, 0.3798, 0.9222, 55.19, 0.5545, 0.8903],
            [187.0, 0.3497, 0.9319, 70.69, 0.5333, 0.8997],
            [239.0, 0.3223, 0.9403, 90.34, 0.5189, 0.9073],
            [305.0, 0.2971, 0.9477, 115.29, 0.5181, 0.9122],
            [390.0, 0.2737, 0.9544, 147.42, 0.5176, 0.9171],
            [498.0, 0.2523, 0.9602, 188.24, 0.5172, 0.9217],
            [635.0, 0.2327, 0.9653, 240.03, 0.5119, 0.9267]
        ];

        algorithm.ZH16BTissues = [
            [4.0, 1.2599, 0.5050, 1.51, 1.7424, 0.4245],
            [5.0, 1.2599, 0.5050, 1.88, 1.6189, 0.4770],
            [8.0, 1.0000, 0.6514, 3.02, 1.3830, 0.5747],
            [12.5, 0.8618, 0.7222, 4.72, 1.1919, 0.6527],
            [18.5, 0.7562, 0.7725, 6.99, 1.0458, 0.7223],
            [27.0, 0.6667, 0.8125, 10.21, 0.9220, 0.7582],
            [38.3, 0.5600, 0.8434, 14.48, 0.8205, 0.7957],
            [54.3, 0.4947, 0.8693, 20.53, 0.7305, 0.8279],
            [77.0, 0.4500, 0.8910, 29.11, 0.6502, 0.8553],
            [109.0, 0.4187, 0.9092, 41.20, 0.5950, 0.8757],
            [146.0, 0.3798, 0.9222, 55.19, 0.5545, 0.8903],
            [187.0, 0.3497, 0.9319, 70.69, 0.5333, 0.8997],
            [239.0, 0.3223, 0.9403, 90.34, 0.5189, 0.9073],
            [305.0, 0.2971, 0.9477, 115.29, 0.5181, 0.9122],
            [390.0, 0.2737, 0.9544, 147.42, 0.5176, 0.9171],
            [498.0, 0.2523, 0.9602, 188.24, 0.5172, 0.9217],
            [635.0, 0.2327, 0.9653, 240.03, 0.5119, 0.9267]
        ];

        algorithm.ZH16CTissues = [
            [4.0, 1.2599, 0.5050, 1.51, 1.7424, 0.4245],
            [5.0, 1.2599, 0.5050, 1.88, 1.6189, 0.4770],
            [8.0, 1.0000, 0.6514, 3.02, 1.3830, 0.5747],
            [12.5, 0.8618, 0.7222, 4.72, 1.1919, 0.6527],
            [18.5, 0.7562, 0.7725, 6.99, 1.0458, 0.7223],
            [27.0, 0.6200, 0.8125, 10.21, 0.9220, 0.7582],
            [38.3, 0.5043, 0.8434, 14.48, 0.8205, 0.7957],
            [54.3, 0.4410, 0.8693, 20.53, 0.7305, 0.8279],
            [77.0, 0.4000, 0.8910, 29.11, 0.6502, 0.8553],
            [109.0, 0.3750, 0.9092, 41.20, 0.5950, 0.8757],
            [146.0, 0.3500, 0.9222, 55.19, 0.5545, 0.8903],
            [187.0, 0.3295, 0.9319, 70.69, 0.5333, 0.8997],
            [239.0, 0.3065, 0.9403, 90.34, 0.5189, 0.9073],
            [305.0, 0.2835, 0.9477, 115.29, 0.5181, 0.9122],
            [390.0, 0.2610, 0.9544, 147.42, 0.5176, 0.9171],
            [498.0, 0.2480, 0.9602, 188.24, 0.5172, 0.9217],
            [635.0, 0.2327, 0.9653, 240.03, 0.5119, 0.9267]
        ];

        function buhlmannTissue(halfTimes, absPressure, isFreshWater) {
            this.halfTimes = halfTimes;
            this.isFreshWater = isFreshWater || false;
            this.waterVapourPressure = dive.waterVapourPressureInBars(35.2);
            this.absPressure = absPressure || 1;
            this.pNitrogen = dive.partialPressure(absPressure || 1, 0.79) - this.waterVapourPressure;
            this.pHelium = 0;
            this.pTotal = this.pNitrogen + this.pHelium;
            this.ceiling = 0;
        };

        buhlmannTissue.prototype.N2HalfTime = function () {
            return this.halfTimes[0];
        };

        buhlmannTissue.prototype.N2AValue = function () {
            return this.halfTimes[1];
        };

        buhlmannTissue.prototype.N2BValue = function () {
            return this.halfTimes[2];
        };

        buhlmannTissue.prototype.HeHalfTime = function () {
            return this.halfTimes[3];
        };

        buhlmannTissue.prototype.HeAValue = function () {
            return this.halfTimes[4];
        };

        buhlmannTissue.prototype.HeBValue = function () {
            return this.halfTimes[5];
        };

        buhlmannTissue.prototype.addFlat = function (depth, fO2, fHe, time) {
            //This is a helper into depth change - with start/end depths identical
            this.addDepthChange(depth, depth, fO2, fHe, time);
        };

        buhlmannTissue.prototype.addDepthChange = function (startDepth, endDepth, fO2, fHe, time) {
            var fN2 = (1 - fO2) - fHe
            // Calculate nitrogen loading
            var gasRate = dive.gasRateInBarsPerMinute(startDepth, endDepth, time, fN2, this.isFreshWater);
            var halfTime = this.N2HalfTime(); // half-time constant = log2/half-time in minutes
            var pGas = dive.gasPressureBreathingInBars(endDepth, fN2, this.isFreshWater); // initial ambient pressure
            var pBegin = this.pNitrogen; // initial compartment inert gas pressure in bar
            this.pNitrogen = dive.schreinerEquation(pBegin, pGas, time, halfTime, gasRate);
            //console.log("pBegin=" + pBegin + ", pGas=" + pGas + ", time=" + time +", halfTime=" + halfTime + ", gasRate=" + gasRate + ", result=" + this.pNitrogen);

            // Calculate helium loading
            gasRate = dive.gasRateInBarsPerMinute(startDepth, endDepth, time, fHe, this.isFreshWater);
            halfTime = this.HeHalfTime();
            pGas = dive.gasPressureBreathingInBars(endDepth, fHe, this.isFreshWater);
            pBegin = this.pHelium;
            this.pHelium = dive.schreinerEquation(pBegin, pGas, time, halfTime, gasRate);

            var prevTotal = this.pTotal;
            // Calculate total loading
            this.pTotal = this.pNitrogen + this.pHelium;

            //return difference - how much load was added
            return this.pTotal - prevTotal;
        };

        buhlmannTissue.prototype.calculateCeiling = function (gf) {
            gf = gf || 1.0
            var a = ((this.N2AValue() * this.pNitrogen) + (this.HeAValue() * this.pHelium)) / (this.pTotal);
            var b = ((this.N2BValue() * this.pNitrogen) + (this.HeBValue() * this.pHelium)) / (this.pTotal);
            var bars = (this.pTotal - (a * gf)) / ((gf / b) + 1.0 - gf);
            //var bars = (this.pTotal - a) * b;
            this.ceiling = dive.barToDepthInMeters(bars, this.isFreshWater);
            //console.log("a:" + a + ", b:" + b + ", bars:" + bars + " ceiling:" + this.ceiling);
            return Math.round(this.ceiling);
        };

        function plan(buhlmannTable, absPressure, isFreshWater) {
            this.table = buhlmannTable;
            this.isFreshWater = isFreshWater;
            this.tissues = [];
            for (var i = 0; i < this.table.length; i++) {
                this.tissues[i] = new buhlmannTissue(this.table[i], absPressure, isFreshWater);
            }
            this.bottomGasses = {};
            this.decoGasses = {};
            this.segments = [];
        };

        plan.prototype.addBottomGas = function(gasName, fO2, fHe) {
            this.bottomGasses[gasName] = dive.gas(fO2, fHe);
        }

        plan.prototype.addDecoGas = function(gasName, fO2, fHe) {
            this.decoGasses[gasName] = dive.gas(fO2, fHe);
        }

        plan.prototype.addFlat = function (depth, gasName, time) {
            return this.addDepthChange(depth, depth, gasName, time);
        };

        plan.prototype.addDepthChange = function (startDepth, endDepth, gasName, time) {
            var gas = this.bottomGasses[gasName] || this.decoGasses[gasName];
            if (typeof gas == 'undefined') {
                throw "Gasname must only be one of registered gasses. Please use plan.addBottomGas or plan.addDecoGas to register a gas.";
            }
            var fO2 = gas.fO2;
            var fHe = gas.fHe;

            //store this as a stage
            this.segments.push(dive.segment(startDepth, endDepth, gasName, time));

            var loadChange = 0.0;
            for (var i = 0; i < this.tissues.length; i++) {
                var tissueChange = this.tissues[i].addDepthChange(startDepth, endDepth, fO2, fHe, time);
                loadChange = loadChange + tissueChange;
            }
            return loadChange;
        };

        plan.prototype.getCeiling = function (gf) {
            gf = gf || 1.0
            var ceiling = 0;
            for (var i = 0; i < this.tissues.length; i++) {
                var tissueCeiling = this.tissues[i].calculateCeiling(gf);
                if (!ceiling || tissueCeiling > ceiling) {
                    ceiling = tissueCeiling;
                }
            }
            while (ceiling % 3 != 0) {
                ceiling++;
            }
            return ceiling;
        };

        plan.prototype.resetTissues = function (origTissuesJSON) {
            var originalTissues = JSON.parse(origTissuesJSON);
            for (var i = 0; i < originalTissues.length; i++) {
                for (var p in originalTissues[i]) {
                    this.tissues[i][p] = originalTissues[i][p];
                }
            }
        }

        plan.prototype.calculateDecompression = function (maintainTissues, gfLow, gfHigh, maxppO2, maxEND, fromDepth) {
            maintainTissues = maintainTissues || false;
            gfLow = gfLow || 1.0;
            gfHigh = gfHigh || 1.0;
            maxppO2 = maxppO2 || 1.6;
            maxEND = maxEND || 30;
            var currentGasName;
            //console.log(this.segments);
            if (typeof fromDepth == 'undefined') {
                if (this.segments.length == 0) {
                    throw "No depth to decompress from has been specified, and neither have any dive stages been registered. Unable to decompress.";
                } else {
                    fromDepth = this.segments[this.segments.length-1].endDepth;
                    currentGasName = this.segments[this.segments.length-1].gasName;
                }
            }

            var gfDiff = gfHigh-gfLow; //find variance in gradient factor
            var distanceToSurface = fromDepth;
            var gfChangePerMeter = gfDiff/distanceToSurface
            if (!maintainTissues) {
                var origTissues = JSON.stringify(this.tissues);
            }

            var ceiling = this.getCeiling(gfLow);

            currentGasName = this.addDecoDepthChange(fromDepth, ceiling, maxppO2, maxEND, currentGasName);

            //console.log("Start Ceiling:" + ceiling + " with GF:" + gfLow)
            while (ceiling > 0) {
                var currentDepth = ceiling;
                var nextDecoDepth = (ceiling - 3);
                var time = 0;
                var gf = gfLow + (gfChangePerMeter * (distanceToSurface - ceiling));
                //console.log("GradientFactor:"+gf + " Next decoDepth:" + nextDecoDepth);
                while (ceiling > nextDecoDepth && time <= 10000) {
                    this.addFlat(currentDepth, currentGasName, 1);
                    time++;
                    ceiling = this.getCeiling(gf);
                }

                //console.log("Held diver at " + currentDepth + " for " + time + " minutes on gas " + currentGasName + ".");
                //console.log("Moving diver from current depth " + currentDepth + " to next ceiling of " + ceiling);
                currentGasName = this.addDecoDepthChange(currentDepth, ceiling, maxppO2, maxEND, currentGasName);
            }
            if (!maintainTissues) {
                this.resetTissues(origTissues);
            }

            return dive.collapseSegments(this.segments);
        };

        plan.prototype.addDecoDepthChange = function(fromDepth, toDepth, maxppO2, maxEND, currentGasName) {
            if (typeof currentGasName == 'undefined') {
                currentGasName = this.bestDecoGasName(fromDepth, maxppO2, maxEND);
                if (typeof currentGasName == 'undefined') {
                    throw "Unable to find starting gas to decompress at depth " + fromDepth + ". No segments provided with bottom mix, and no deco gas operational at this depth.";
                }
            }

           // console.log("Starting depth change from " + fromDepth + " moving to " + toDepth + " with starting gas " + currentGasName);
            while (toDepth < fromDepth) { //if ceiling is higher, move our diver up.
                //ensure we're on the best gas
                var betterDecoGasName = this.bestDecoGasName(fromDepth, maxppO2, maxEND);
                if (typeof betterDecoGasName != 'undefined' && betterDecoGasName != currentGasName) {
                    //console.log("At depth " + fromDepth + " found a better deco gas " + betterDecoGasName + ". Switching to better gas.");
                    currentGasName = betterDecoGasName;
                }

                //console.log("Looking for the next best gas moving up between " + fromDepth + " and " + toDepth);
                var ceiling = toDepth; //ceiling is toDepth, unless there's a better gas to switch to on the way up.
                for (var nextDepth=fromDepth-1; nextDepth >= ceiling; nextDepth--) {
                    var nextDecoGasName = this.bestDecoGasName(nextDepth, maxppO2, maxEND);
                    //console.log("Testing next gas at depth: " + nextDepth + " and found: " + nextDecoGasName);
                    if (typeof nextDecoGasName != 'undefined' &&
                        nextDecoGasName != currentGasName) {
                        //console.log("Found a gas " + nextDecoGasName + " to switch to at " + nextDepth + " which is lower than target ceiling of " + ceiling);
                        ceiling = nextDepth; //Only carry us up to the point where we can use this better gas.
                        break;
                    }
                }

                //take us to the ceiling at 30fpm or 10 mpm (the fastest ascent rate possible.)
                var depthdiff = fromDepth - ceiling;
                var time = depthdiff/10;
                //console.log("Moving diver from " + fromDepth + " to " + ceiling + " on gas " + currentGasName + " over " + time + " minutes (10 meters or 30 feet per minute).")
                this.addDepthChange(fromDepth, ceiling, currentGasName, time);

                fromDepth = ceiling; //move up from-depth
            }

            var betterDecoGasName = this.bestDecoGasName(fromDepth, maxppO2, maxEND);
            if (typeof betterDecoGasName != 'undefined' && betterDecoGasName != currentGasName) {
                //console.log("At depth " + fromDepth + " found a better deco gas " + betterDecoGasName + ". Switching to better gas.");
                currentGasName = betterDecoGasName;
            }

            return currentGasName;

        }

        plan.prototype.bestDecoGasName = function(depth, maxppO2, maxEND) {
            //console.log("Finding best deco gas for depth " + depth + " with max ppO2 of " + maxppO2 + "  and max END of " + maxEND);
            //best gas is defined as: a ppO2 at depth <= maxppO2,
            // the highest ppO2 among all of these.
            // END <= 30 (equivalent narcotic depth < 30 meters)
            var winner;
            var winnerName;
            for (var gasName in this.decoGasses) {
                var candidateGas = this.decoGasses[gasName];
                var mod = Math.round(candidateGas.modInMeters(maxppO2, this.isFreshWater));
                var end = Math.round(candidateGas.endInMeters(depth, this.isFreshWater));
                //console.log("Found candidate deco gas " + gasName + ": " + (candidateGas.fO2) + "/" + (candidateGas.fHe) + " with mod " + mod + " and END " + end);
                if (depth <= mod && end <= maxEND) {
                    //console.log("Candidate " + gasName + " fits within MOD and END limits.");
                    if (typeof winner == 'undefined' || //either we have no winner yet
                        winner.fO2 < candidateGas.fO2) { //or previous winner is a lower O2
                        //console.log("Replaced winner: " + candidateGas);
                        winner = candidateGas;
                        winnerName = gasName;
                    }

                }
            }
            return winnerName;
        }

        plan.prototype.ndl = function (depth, gasName, gf) {
            gf = gf || 1.0

            var ceiling = this.getCeiling(gf);
            //console.log("Ceiling:" +ceiling);

            var origTissues = JSON.stringify(this.tissues);
            var time = 0;
            var change = 1;
            while (ceiling < 0 && change > 0) {
                //console.log("Ceiling:" +ceiling);
                change = this.addFlat(depth, gasName, gf);
                ceiling = this.getCeiling(gf);
                time++;
            }
            this.resetTissues(origTissues);
            if (change == 0) {
                console.log("NDL is practially infinity. Returning largest number we know of.");
                return Math.POSITIVE_INFINITY;
            }
            return time; //We went one minute past a ceiling of "0"
        };

        algorithm.buhlmannTissue = buhlmannTissue;
        algorithm.plan = plan;

        return algorithm;

    };

}).call(this);
