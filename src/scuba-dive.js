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
            } else {
                currentGasName = this.bestDecoGasName(fromDepth, maxppO2, maxEND);
                if (typeof currentGasName == 'undefined') {
                    throw "No deco gas found to decompress from provided depth " + fromDepth;
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
/********************************************************************************************************************
 * This code was pulled from: https://github.com/bwaite/vpmb
 *
 # Copyright 2010, Bryan Waite, Erik C. Baker. All rights reserved.
 # Redistribution and use in source and binary forms, with or without modification, are
 # permitted provided that the following conditions are met:

 #    1. Redistributions of source code must retain the above copyright notice, this list of
 #       conditions and the following disclaimer.

 #    2. Redistributions in binary form must reproduce the above copyright notice, this list
 #       of conditions and the following disclaimer in the documentation and/or other materials
 #       provided with the distribution.

 # THIS SOFTWARE IS PROVIDED BY Bryan Waite, Erik C. Baker ``AS IS'' AND ANY EXPRESS OR IMPLIED
 # WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 # FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL Bryan Waite, or Erik C. Baker OR
 # CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 # CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 # SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 # ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 # NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
 # ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

 # The views and conclusions contained in the software and documentation are those of the
 # authors and should not be interpreted as representing official policies, either expressed
 # or implied, of Bryan Waite, or Erik C. Baker.

 Furthermore, this code was converted by Archis Gore to python using rapydscript: http://rapydscript.pyjeon.com/
 and then hand-edited to work in a browser. The forked repository where this work is done, is
 located here: https://github.com/archisgore/vpmb

 Beyond that, this file contains a shim which adapts the internal VPM state-machine
 to provide an API interface very similar to buhlmann that already exists in this
 library.

 This allows a similarity in creating dive plans and interchangability of algorithms.

 This code is for experimental purposes ONLY, and no attempt should be made to use this
 for any real diving ever! This code CAN AND WILL BE WRONG!

 PLEASE See the input json format reference here:
 https://github.com/archisgore/vpmb/blob/master/doc/vpm_decompression_input.json

 ********************************************************************************************************************/
$self.vpm = function () {
  var VPMDivePlan = function (input_json) {
    'use strict';
    var ՐՏ_Temp;
    function ՐՏ_Iterable(iterable) {
      if (Array.isArray(iterable) || iterable instanceof String || typeof iterable === 'string') {
        return iterable;
      }
      return Object.keys(iterable);
    }
    function ՐՏ_bind(fn, thisArg) {
      var ret;
      if (fn.orig) {
        fn = fn.orig;
      }
      if (thisArg === false) {
        return fn;
      }
      ret = function () {
        return fn.apply(thisArg, arguments);
      };
      ret.orig = fn;
      return ret;
    }
    function range(start, stop, step) {
      var length, idx, range;
      if (arguments.length <= 1) {
        stop = start || 0;
        start = 0;
      }
      step = arguments[2] || 1;
      length = Math.max(Math.ceil((stop - start) / step), 0);
      idx = 0;
      range = new Array(length);
      while (idx < length) {
        range[idx++] = start;
        start += step;
      }
      return range;
    }
    function len(obj) {
      if (Array.isArray(obj) || typeof obj === 'string') {
        return obj.length;
      }
      return Object.keys(obj).length;
    }
    function eq(a, b) {
      var i;
      //"\n    Equality comparison that works with all data types, returns true if structure and\n    contents of first object equal to those of second object\n\n    Arguments:\n        a: first object\n        b: second object\n    ";
      if (a === b) {
        return true;
      }
      if (Array.isArray(a) && Array.isArray(b) || a instanceof Object && b instanceof Object) {
        if (a.constructor !== b.constructor || a.length !== b.length) {
          return false;
        }
        if (Array.isArray(a)) {
          for (i = 0; i < len(a); i++) {
            if (!eq(a[i], b[i])) {
              return false;
            }
          }
        } else {
          var ՐՏ_Iter0 = ՐՏ_Iterable(a);
          for (var ՐՏ_Index0 = 0; ՐՏ_Index0 < ՐՏ_Iter0.length; ՐՏ_Index0++) {
            i = ՐՏ_Iter0[ՐՏ_Index0];
            if (!eq(a[i], b[i])) {
              return false;
            }
          }
        }
        return true;
      }
      return false;
    }
    function ՐՏ_in(val, arr) {
      if (Array.isArray(arr) || typeof arr === 'string') {
        return arr.indexOf(val) !== -1;
      } else {
        if (arr.hasOwnProperty(val)) {
          return true;
        }
        return false;
      }
    }
    function dir(item) {
      var arr;
      arr = [];
      for (var i in item) {
        arr.push(i);
      }
      return arr;
    }
    function ՐՏ_extends(child, parent) {
      child.prototype = Object.create(parent.prototype);
      child.prototype.constructor = child;
    }
    function max(a) {
      if (Array.isArray(a)) {
        return Math.max.apply(null, a);
      } else {
        return Math.max.apply(null, arguments);
      }
    }
    function abs(n) {
      return Math.abs(n);
    }
    function min(a) {
      if (Array.isArray(a)) {
        return Math.min.apply(null, a);
      } else {
        return Math.min.apply(null, arguments);
      }
    }
    function ValueError() {
      ValueError.prototype.__init__.apply(this, arguments);
    }
    ՐՏ_extends(ValueError, Error);
    ValueError.prototype.__init__ = function __init__(message) {
      var self = this;
      self.name = 'ValueError';
      self.message = message;
    };
    function enumerate(item) {
      var arr;
      arr = [];
      for (var i = 0; i < item.length; i++) {
        arr[arr.length] = [
          i,
          item[i]
        ];
      }
      return arr;
    }
    function ՐՏ_print() {
      if (typeof console === 'object') {
        console.log.apply(console, arguments);
      }
    }
    var __name__ = '__main__';
    var program_state;
    var ARRAY_LENGTH = 16;
    function AltitudeException() {
      AltitudeException.prototype.__init__.apply(this, arguments);
    }
    'Thrown when altitude is invalid, or diver acclimatized is invalid.';
    AltitudeException.prototype.__init__ = function __init__(value) {
      var self = this;
      self.value = value;
    };
    AltitudeException.prototype.__str__ = function __str__() {
      var self = this;
      return repr(self.value);
    };
    function MaxIterationException() {
      MaxIterationException.prototype.__init__.apply(this, arguments);
    }
    'Thrown when root finding fails.';
    MaxIterationException.prototype.__init__ = function __init__(value) {
      var self = this;
      self.value = value;
    };
    MaxIterationException.prototype.__str__ = function __str__() {
      var self = this;
      return repr(self.value);
    };
    function InputFileException() {
      InputFileException.prototype.__init__.apply(this, arguments);
    }
    'Thrown when there are errors with the input file values.';
    InputFileException.prototype.__init__ = function __init__(value) {
      var self = this;
      self.value = value;
    };
    InputFileException.prototype.__str__ = function __str__() {
      var self = this;
      return repr(self.value);
    };
    function DecompressionStepException() {
      DecompressionStepException.prototype.__init__.apply(this, arguments);
    }
    'Thrown when the decompression step is too large.';
    DecompressionStepException.prototype.__init__ = function __init__(value) {
      var self = this;
      self.value = value;
    };
    DecompressionStepException.prototype.__str__ = function __str__() {
      var self = this;
      return repr(self.value);
    };
    function RootException() {
      RootException.prototype.__init__.apply(this, arguments);
    }
    'Thrown when root calculated is not within brackets';
    RootException.prototype.__init__ = function __init__(value) {
      var self = this;
      self.value = value;
    };
    RootException.prototype.__str__ = function __str__() {
      var self = this;
      return repr(self.value);
    };
    function OffGassingException() {
      OffGassingException.prototype.__init__.apply(this, arguments);
    }
    'Thrown when Off Gassing gradient is too small';
    OffGassingException.prototype.__init__ = function __init__(value) {
      var self = this;
      self.value = value;
    };
    OffGassingException.prototype.__str__ = function __str__() {
      var self = this;
      return repr(self.value);
    };
    function DiveState() {
      DiveState.prototype.__init__.apply(this, arguments);
    }
    'Contains the program state so that this isn\'t a huge mess';
    DiveState.prototype.__init__ = function __init__(json_input) {
      var self = this;
      if (typeof json_input === 'undefined') {
        throw 'json_input cannot be undefined or null or empty.';
      }
      var newZeroArray = function () {
        var zeroArray = [];
        for (var i = 0; i < ARRAY_LENGTH; i++) {
          zeroArray.push(0);
        }
        return zeroArray;
      };
      self.input_values = json_input.input;
      self.settings_values = json_input.settings;
      self.altitude_values = json_input.altitude;
      self.output_object = new HtmlOutput(self);
      self.Units = '';
      self.Units_Word1 = '';
      self.Units_Word2 = '';
      self.Number_of_Changes = 0;
      self.Segment_Number_Start_of_Ascent = 0;
      self.Repetitive_Dive_Flag = 0;
      self.Schedule_Converged = false;
      self.Critical_Volume_Algorithm_Off = false;
      self.Altitude_Dive_Algorithm_Off = false;
      self.Ascent_Ceiling_Depth = 0;
      self.Deco_Stop_Depth = 0;
      self.Step_Size = 0;
      self.Sum_Check = 0;
      self.Depth = 0;
      self.Ending_Depth = 0;
      self.Starting_Depth = 0;
      self.Rate = 0;
      self.Run_Time_End_of_Segment = 0;
      self.Last_Run_Time = 0;
      self.Stop_Time = 0;
      self.Depth_Start_of_Deco_Zone = 0;
      self.Deepest_Possible_Stop_Depth = 0;
      self.First_Stop_Depth = 0;
      self.Critical_Volume_Comparison = 0;
      self.Next_Stop = 0;
      self.Run_Time_Start_of_Deco_Zone = 0;
      self.Critical_Radius_N2_Microns = 0;
      self.Critical_Radius_He_Microns = 0;
      self.Run_Time_Start_of_Ascent = 0;
      self.Altitude_of_Dive = 0;
      self.Deco_Phase_Volume_Time = 0;
      self.Surface_Interval_Time = 0;
      self.Regenerated_Radius_He = newZeroArray();
      self.Regenerated_Radius_N2 = newZeroArray();
      self.Mix_Change = [];
      self.Depth_Change = [];
      self.Rate_Change = [];
      self.Step_Size_Change = [];
      self.He_Pressure_Start_of_Ascent = newZeroArray();
      self.N2_Pressure_Start_of_Ascent = newZeroArray();
      self.He_Pressure_Start_of_Deco_Zone = newZeroArray();
      self.N2_Pressure_Start_of_Deco_Zone = newZeroArray();
      self.Phase_Volume_Time = newZeroArray();
      self.Last_Phase_Volume_Time = newZeroArray();
      self.Allowable_Gradient_He = newZeroArray();
      self.Allowable_Gradient_N2 = newZeroArray();
      self.Adjusted_Crushing_Pressure_He = newZeroArray();
      self.Adjusted_Crushing_Pressure_N2 = newZeroArray();
      self.Initial_Allowable_Gradient_N2 = newZeroArray();
      self.Initial_Allowable_Gradient_He = newZeroArray();
      self.Deco_Gradient_He = newZeroArray();
      self.Deco_Gradient_N2 = newZeroArray();
      self.Water_Vapor_Pressure = 0;
      self.Surface_Tension_Gamma = 0;
      self.Skin_Compression_GammaC = 0;
      self.Crit_Volume_Parameter_Lambda = 0;
      self.Minimum_Deco_Stop_Time = 0;
      self.Regeneration_Time_Constant = 0;
      self.Constant_Pressure_Other_Gases = 0;
      self.Gradient_Onset_of_Imperm_Atm = 0;
      self.ATM = 101325;
      self.fraction_inert_gas = 0.79;
      self.Segment_Number = 0;
      self.Run_Time = 0;
      self.Segment_Time = 0;
      self.Ending_Ambient_Pressure = 0;
      self.Mix_Number = 0;
      self.Barometric_Pressure = 0;
      self.units_fsw = false;
      self.Units_Factor = 0;
      self.Helium_Time_Constant = newZeroArray();
      self.Nitrogen_Time_Constant = newZeroArray();
      self.Helium_Pressure = newZeroArray();
      self.Nitrogen_Pressure = newZeroArray();
      self.Initial_Helium_Pressure = newZeroArray();
      self.Initial_Nitrogen_Pressure = newZeroArray();
      self.Fraction_Helium = [];
      self.Fraction_Nitrogen = [];
      self.Initial_Critical_Radius_He = newZeroArray();
      self.Initial_Critical_Radius_N2 = newZeroArray();
      self.Adjusted_Critical_Radius_He = newZeroArray();
      self.Adjusted_Critical_Radius_N2 = newZeroArray();
      self.Max_Crushing_Pressure_He = newZeroArray();
      self.Max_Crushing_Pressure_N2 = newZeroArray();
      self.Surface_Phase_Volume_Time = newZeroArray();
      self.Max_Actual_Gradient = newZeroArray();
      self.Amb_Pressure_Onset_of_Imperm = newZeroArray();
      self.Gas_Tension_Onset_of_Imperm = newZeroArray();
      self.Diver_Acclimatized = null;
      self.Helium_Half_Time = [
        1.88,
        3.02,
        4.72,
        6.99,
        10.21,
        14.48,
        20.53,
        29.11,
        41.2,
        55.19,
        70.69,
        90.34,
        115.29,
        147.42,
        188.24,
        240.03
      ];
      self.Nitrogen_Half_Time = [
        5,
        8,
        12.5,
        18.5,
        27,
        38.3,
        54.3,
        77,
        109,
        146,
        187,
        239,
        305,
        390,
        498,
        635
      ];
    };
    DiveState.prototype.get_json = function get_json() {
      var self = this;
      return self.output_object.get_json();
    };
    DiveState.prototype.gas_loadings_surface_interval = function gas_loadings_surface_interval(surface_interval_time) {
      var self = this;
      var inspired_helium_pressure, inspired_nitrogen_pressure, temp_helium_pressure, temp_nitrogen_pressure, i;
      '\n        Purpose: This subprogram calculates the gas loading (off-gassing) during\n        a surface interval.\n\n        Side Effects: Sets\n        `self.Helium_Pressure`,\n        `self.Nitrogen_Pressure`\n\n        Returns: None\n        ';
      inspired_helium_pressure = 0;
      inspired_nitrogen_pressure = (self.Barometric_Pressure - self.Water_Vapor_Pressure) * self.fraction_inert_gas;
      for (i = 0; i < ARRAY_LENGTH; i++) {
        temp_helium_pressure = self.Helium_Pressure[i];
        temp_nitrogen_pressure = self.Nitrogen_Pressure[i];
        self.Helium_Pressure[i] = haldane_equation(temp_helium_pressure, inspired_helium_pressure, self.Helium_Time_Constant[i], surface_interval_time);
        self.Nitrogen_Pressure[i] = haldane_equation(temp_nitrogen_pressure, inspired_nitrogen_pressure, self.Nitrogen_Time_Constant[i], surface_interval_time);
      }
    };
    DiveState.prototype._new_critical_radius = function _new_critical_radius(max_actual_gradient_pascals, adj_crush_pressure_pascals) {
      var self = this;
      'Calculates the new radius for the `VPM_REPETITIVE_ALGORITHM`\n\n        Side Effects: None\n        Returns: A floating point value\n        ';
      return 2 * self.Surface_Tension_Gamma * (self.Skin_Compression_GammaC - self.Surface_Tension_Gamma) / (max_actual_gradient_pascals * self.Skin_Compression_GammaC - self.Surface_Tension_Gamma * adj_crush_pressure_pascals);
    };
    DiveState.prototype.vpm_repetitive_algorithm = function vpm_repetitive_algorithm(surface_interval_time) {
      var self = this;
      var max_actual_gradient_pascals, adj_crush_pressure_he_pascals, adj_crush_pressure_n2_pascals, new_critical_radius_n2, new_critical_radius_he, i;
      '\n        Purpose: This subprogram implements the VPM Repetitive Algorithm that was\n        envisioned by Professor David E. Yount only months before his passing.\n\n        Side Effects: Sets\n        `self.Adjusted_Critical_Radius_He`,\n        `self.Adjusted_Critical_Radius_N2`\n\n        Returns: None\n        ';
      for (i = 0; i < ARRAY_LENGTH; i++) {
        max_actual_gradient_pascals = self.Max_Actual_Gradient[i] / self.Units_Factor * self.ATM;
        adj_crush_pressure_he_pascals = self.Adjusted_Crushing_Pressure_He[i] / self.Units_Factor * self.ATM;
        adj_crush_pressure_n2_pascals = self.Adjusted_Crushing_Pressure_N2[i] / self.Units_Factor * self.ATM;
        if (self.Max_Actual_Gradient[i] > self.Initial_Allowable_Gradient_N2[i]) {
          new_critical_radius_n2 = self._new_critical_radius(max_actual_gradient_pascals, adj_crush_pressure_n2_pascals);
          self.Adjusted_Critical_Radius_N2[i] = self.Initial_Critical_Radius_N2[i] + (self.Initial_Critical_Radius_N2[i] - new_critical_radius_n2) * Math.exp(-surface_interval_time / self.Regeneration_Time_Constant);
        } else {
          self.Adjusted_Critical_Radius_N2[i] = self.Initial_Critical_Radius_N2[i];
        }
        if (self.Max_Actual_Gradient[i] > self.Initial_Allowable_Gradient_He[i]) {
          new_critical_radius_he = self._new_critical_radius(max_actual_gradient_pascals, adj_crush_pressure_he_pascals);
          self.Adjusted_Critical_Radius_He[i] = self.Initial_Critical_Radius_He[i] + (self.Initial_Critical_Radius_He[i] - new_critical_radius_he) * Math.exp(-surface_interval_time / self.Regeneration_Time_Constant);
        } else {
          self.Adjusted_Critical_Radius_He[i] = self.Initial_Critical_Radius_He[i];
        }
      }
    };
    DiveState.prototype.calc_max_actual_gradient = function calc_max_actual_gradient(deco_stop_depth) {
      var self = this;
      var compartment_gradient, i;
      '\n        Purpose: This subprogram calculates the actual supersaturation gradient\n        obtained in each compartment as a result of the ascent profile during\n        decompression.  Similar to the concept with crushing pressure, the\n        supersaturation gradients are not cumulative over a multi-level, staged\n        ascent.  Rather, it will be the maximum value obtained in any one discrete\n        step of the overall ascent.  Thus, the program must compute and store the\n        maximum actual gradient for each compartment that was obtained across all\n        steps of the ascent profile.  This subroutine is invoked on the last pass\n        through the deco stop loop block when the final deco schedule is being\n        generated.\n\n        The max actual gradients are later used by the VPM Repetitive Algorithm to\n        determine if adjustments to the critical radii are required.  If the max\n        actual gradient did not exceed the initial allowable gradient, then no\n        adjustment will be made.  However, if the max actual gradient did exceed\n        the initial allowable gradient, such as permitted by the Critical Volume\n        Algorithm, then the critical radius will be adjusted (made larger) on the\n        repetitive dive to compensate for the bubbling that was allowed on the\n        previous dive.  The use of the max actual gradients is intended to prevent\n        the repetitive algorithm from being overly conservative.\n\n        Side Effects: Sets\n        `self.Max_Actual_Gradient`\n\n        Returns: None\n        ';
      for (i = 0; i < ARRAY_LENGTH; i++) {
        compartment_gradient = self.Helium_Pressure[i] + self.Nitrogen_Pressure[i] + self.Constant_Pressure_Other_Gases - (deco_stop_depth + self.Barometric_Pressure);
        if (compartment_gradient <= 0) {
          compartment_gradient = 0;
        }
        self.Max_Actual_Gradient[i] = max(self.Max_Actual_Gradient[i], compartment_gradient);
      }
    };
    DiveState.prototype.vpm_altitude_dive_algorithm = function vpm_altitude_dive_algorithm(altitude_settings) {
      var self = this;
      var ascent_to_altitude_time, time_at_altitude_before_dive, starting_ambient_pressure, i, ending_ambient_pressure, initial_inspired_n2_pressure, rate, nitrogen_rate, compartment_gradient, compartment_gradient_pascals, gradient_he_bubble_formation, new_critical_radius_he, ending_radius_he, regenerated_radius_he, gradient_n2_bubble_formation, new_critical_radius_n2, ending_radius_n2, regenerated_radius_n2, inspired_nitrogen_pressure, initial_nitrogen_pressure;
      '\n        Purpose:  This subprogram updates gas loadings and adjusts critical radii\n        (as required) based on whether or not diver is acclimatized at altitude or\n        makes an ascent to altitude before the dive.\n\n        Side Effects: Sets\n        `self.Adjusted_Critical_Radius_He`,\n        `self.Adjusted_Critical_Radius_N2`,\n        `self.Barometric_Pressure`,\n        `self.Helium_Pressure`,\n        `self.Initial_Critical_Radius_He`,\n        `self.Initial_Critical_Radius_N2`\n        `self.Nitrogen_Pressure`,\n\n        or\n\n        Raises an AltitudeException\n\n        Returns: None\n        ';
      ascent_to_altitude_time = altitude_settings.Ascent_to_Altitude_Hours * 60;
      time_at_altitude_before_dive = altitude_settings.Hours_at_Altitude_Before_Dive * 60;
      if (self.Diver_Acclimatized) {
        self.Barometric_Pressure = calc_barometric_pressure(altitude_settings.Altitude_of_Dive, self.units_fsw);
        for (i = 0; i < ARRAY_LENGTH; i++) {
          self.Adjusted_Critical_Radius_N2[i] = self.Initial_Critical_Radius_N2[i];
          self.Adjusted_Critical_Radius_He[i] = self.Initial_Critical_Radius_He[i];
          self.Helium_Pressure[i] = 0;
          self.Nitrogen_Pressure[i] = (self.Barometric_Pressure - self.Water_Vapor_Pressure) * self.fraction_inert_gas;
        }
      } else {
        if (altitude_settings.Starting_Acclimatized_Altitude >= altitude_settings.Altitude_of_Dive || altitude_settings.Starting_Acclimatized_Altitude < 0) {
          throw new AltitudeException('ERROR! STARTING ACCLIMATIZED ALTITUDE MUST BE LESS THAN ALTITUDE OF DIVE AND GREATER THAN OR EQUAL TO ZERO');
        }
        self.Barometric_Pressure = calc_barometric_pressure(altitude_settings.Starting_Acclimatized_Altitude, self.units_fsw);
        starting_ambient_pressure = self.Barometric_Pressure;
        for (i = 0; i < ARRAY_LENGTH; i++) {
          self.Helium_Pressure[i] = 0;
          self.Nitrogen_Pressure[i] = (self.Barometric_Pressure - self.Water_Vapor_Pressure) * self.fraction_inert_gas;
        }
        self.Barometric_Pressure = calc_barometric_pressure(altitude_settings.Altitude_of_Dive, self.units_fsw);
        ending_ambient_pressure = self.Barometric_Pressure;
        initial_inspired_n2_pressure = (starting_ambient_pressure - self.Water_Vapor_Pressure) * self.fraction_inert_gas;
        rate = (ending_ambient_pressure - starting_ambient_pressure) / ascent_to_altitude_time;
        nitrogen_rate = rate * self.fraction_inert_gas;
        for (i = 0; i < ARRAY_LENGTH; i++) {
          initial_nitrogen_pressure = self.Nitrogen_Pressure[i];
          self.Nitrogen_Pressure[i] = schreiner_equation(initial_inspired_n2_pressure, nitrogen_rate, ascent_to_altitude_time, self.Nitrogen_Time_Constant[i], initial_nitrogen_pressure);
          compartment_gradient = self.Nitrogen_Pressure[i] + self.Constant_Pressure_Other_Gases - ending_ambient_pressure;
          compartment_gradient_pascals = compartment_gradient / self.Units_Factor * self.ATM;
          gradient_he_bubble_formation = 2 * self.Surface_Tension_Gamma * (self.Skin_Compression_GammaC - self.Surface_Tension_Gamma) / (self.Initial_Critical_Radius_He[i] * self.Skin_Compression_GammaC);
          if (compartment_gradient_pascals > gradient_he_bubble_formation) {
            new_critical_radius_he = 2 * self.Surface_Tension_Gamma * (self.Skin_Compression_GammaC - self.Surface_Tension_Gamma) / (compartment_gradient_pascals * self.Skin_Compression_GammaC);
            self.Adjusted_Critical_Radius_He[i] = self.Initial_Critical_Radius_He[i] + (self.Initial_Critical_Radius_He[i] - new_critical_radius_he) * Math.exp(-time_at_altitude_before_dive / self.Regeneration_Time_Constant);
            self.Initial_Critical_Radius_He[i] = self.Adjusted_Critical_Radius_He[i];
          } else {
            ending_radius_he = 1 / (compartment_gradient_pascals / (2 * (self.Surface_Tension_Gamma - self.Skin_Compression_GammaC)) + 1 / self.Initial_Critical_Radius_He[i]);
            regenerated_radius_he = self.Initial_Critical_Radius_He[i] + (ending_radius_he - self.Initial_Critical_Radius_He[i]) * Math.exp(-time_at_altitude_before_dive / self.Regeneration_Time_Constant);
            self.Initial_Critical_Radius_He[i] = regenerated_radius_he;
            self.Adjusted_Critical_Radius_He[i] = self.Initial_Critical_Radius_He[i];
          }
          gradient_n2_bubble_formation = 2 * self.Surface_Tension_Gamma * (self.Skin_Compression_GammaC - self.Surface_Tension_Gamma) / (self.Initial_Critical_Radius_N2[i] * self.Skin_Compression_GammaC);
          if (compartment_gradient_pascals > gradient_n2_bubble_formation) {
            new_critical_radius_n2 = 2 * self.Surface_Tension_Gamma * (self.Skin_Compression_GammaC - self.Surface_Tension_Gamma) / (compartment_gradient_pascals * self.Skin_Compression_GammaC);
            self.Adjusted_Critical_Radius_N2[i] = self.Initial_Critical_Radius_N2[i] + (self.Initial_Critical_Radius_N2[i] - new_critical_radius_n2) * Math.exp(-time_at_altitude_before_dive / self.Regeneration_Time_Constant);
            self.Initial_Critical_Radius_N2[i] = self.Adjusted_Critical_Radius_N2[i];
          } else {
            ending_radius_n2 = 1 / (compartment_gradient_pascals / (2 * (self.Surface_Tension_Gamma - self.Skin_Compression_GammaC)) + 1 / self.Initial_Critical_Radius_N2[i]);
            regenerated_radius_n2 = self.Initial_Critical_Radius_N2[i] + (ending_radius_n2 - self.Initial_Critical_Radius_N2[i]) * Math.exp(-time_at_altitude_before_dive / self.Regeneration_Time_Constant);
            self.Initial_Critical_Radius_N2[i] = regenerated_radius_n2;
            self.Adjusted_Critical_Radius_N2[i] = self.Initial_Critical_Radius_N2[i];
          }
        }
        inspired_nitrogen_pressure = (self.Barometric_Pressure - self.Water_Vapor_Pressure) * self.fraction_inert_gas;
        for (i = 0; i < ARRAY_LENGTH; i++) {
          initial_nitrogen_pressure = self.Nitrogen_Pressure[i];
          self.Nitrogen_Pressure[i] = haldane_equation(initial_nitrogen_pressure, inspired_nitrogen_pressure, self.Nitrogen_Time_Constant[i], time_at_altitude_before_dive);
        }
      }
    };
    DiveState.prototype.gas_loadings_ascent_descent = function gas_loadings_ascent_descent(starting_depth, ending_depth, rate) {
      var self = this;
      var starting_ambient_pressure, initial_inspired_he_pressure, initial_inspired_n2_pressure, helium_rate, nitrogen_rate, i;
      '\n         Purpose: This subprogram applies the Schreiner equation to update the\n         gas loadings (partial pressures of helium and nitrogen) in the half-time\n         compartments due to a linear ascent or descent segment at a constant rate.\n\n         Side Effects: Sets `self.Segment_Time`,\n         `self.Ending_Ambient_Pressure`,\n         `self.Helium_Pressure`,\n         `self.Initial_Helium_Pressure`,\n         `self.Initial_Nitrogen_Pressure`,\n         `self.Nitrogen_Pressure`\n         `self.Run_Time`,\n         `self.Segment_Number`,\n\n         Returns: None\n         ';
      self.Segment_Time = parseFloat(ending_depth - starting_depth) / rate;
      self.Run_Time += self.Segment_Time;
      self.Segment_Number += 1;
      self.Ending_Ambient_Pressure = ending_depth + self.Barometric_Pressure;
      starting_ambient_pressure = starting_depth + self.Barometric_Pressure;
      initial_inspired_he_pressure = (starting_ambient_pressure - self.Water_Vapor_Pressure) * self.Fraction_Helium[self.Mix_Number - 1];
      initial_inspired_n2_pressure = (starting_ambient_pressure - self.Water_Vapor_Pressure) * self.Fraction_Nitrogen[self.Mix_Number - 1];
      helium_rate = rate * self.Fraction_Helium[self.Mix_Number - 1];
      nitrogen_rate = rate * self.Fraction_Nitrogen[self.Mix_Number - 1];
      for (i = 0; i < ARRAY_LENGTH; i++) {
        self.Initial_Helium_Pressure[i] = self.Helium_Pressure[i];
        self.Initial_Nitrogen_Pressure[i] = self.Nitrogen_Pressure[i];
        self.Helium_Pressure[i] = schreiner_equation(initial_inspired_he_pressure, helium_rate, self.Segment_Time, self.Helium_Time_Constant[i], self.Initial_Helium_Pressure[i]);
        self.Nitrogen_Pressure[i] = schreiner_equation(initial_inspired_n2_pressure, nitrogen_rate, self.Segment_Time, self.Nitrogen_Time_Constant[i], self.Initial_Nitrogen_Pressure[i]);
      }
    };
    DiveState.prototype._crushing_pressure_helper = function _crushing_pressure_helper(radius_onset_of_imperm_molecule, ending_ambient_pressure_pa, amb_press_onset_of_imperm_pa, gas_tension_onset_of_imperm_pa, gradient_onset_of_imperm_pa) {
      var self = this;
      var A, B, C, high_bound, low_bound, ending_radius, crushing_pressure_pascals;
      'Calculate the crushing pressure for a molecule(He or N2) (a helper for CALC_CRUSHING_PRESSURE)\n\n        Side Effects: None\n\n        Returns: A floating point value\n        ';
      A = ending_ambient_pressure_pa - amb_press_onset_of_imperm_pa + gas_tension_onset_of_imperm_pa + 2 * (self.Skin_Compression_GammaC - self.Surface_Tension_Gamma) / radius_onset_of_imperm_molecule;
      B = 2 * (self.Skin_Compression_GammaC - self.Surface_Tension_Gamma);
      C = gas_tension_onset_of_imperm_pa * Math.pow(radius_onset_of_imperm_molecule, 3);
      high_bound = radius_onset_of_imperm_molecule;
      low_bound = B / A;
      ending_radius = radius_root_finder(A, B, C, low_bound, high_bound);
      crushing_pressure_pascals = gradient_onset_of_imperm_pa + ending_ambient_pressure_pa - amb_press_onset_of_imperm_pa + gas_tension_onset_of_imperm_pa * (1 - Math.pow(radius_onset_of_imperm_molecule, 3) / Math.pow(ending_radius, 3));
      return crushing_pressure_pascals / self.ATM * self.Units_Factor;
    };
    DiveState.prototype.calc_crushing_pressure = function calc_crushing_pressure(starting_depth, ending_depth, rate) {
      var self = this;
      var gradient_onset_of_imperm, gradient_onset_of_imperm_pa, starting_ambient_pressure, ending_ambient_pressure, starting_gas_tension, starting_gradient, ending_gas_tension, ending_gradient, radius_onset_of_imperm_he, radius_onset_of_imperm_n2, ending_ambient_pressure_pa, amb_press_onset_of_imperm_pa, gas_tension_onset_of_imperm_pa, crushing_pressure_he, crushing_pressure_n2, i;
      '\n         Purpose: Compute the effective "crushing pressure" in each compartment as\n         a result of descent segment(s).  The crushing pressure is the gradient\n         (difference in pressure) between the outside ambient pressure and the\n         gas tension inside a VPM nucleus (bubble seed).  This gradient acts to\n         reduce (shrink) the radius smaller than its initial value at the surface.\n         This phenomenon has important ramifications because the smaller the radius\n         of a VPM nucleus, the greater the allowable supersaturation gradient upon\n         ascent.  Gas loading (uptake) during descent, especially in the fast\n         compartments, will reduce the magnitude of the crushing pressure.  The\n         crushing pressure is not cumulative over a multi-level descent.  It will\n         be the maximum value obtained in any one discrete segment of the overall\n         descent.  Thus, the program must compute and store the maximum crushing\n         pressure for each compartment that was obtained across all segments of\n         the descent profile.\n\n         The calculation of crushing pressure will be different depending on\n         whether or not the gradient is in the VPM permeable range (gas can diffuse\n         across skin of VPM nucleus) or the VPM impermeable range (molecules in\n         skin of nucleus are squeezed together so tight that gas can no longer\n         diffuse in or out of nucleus; the gas becomes trapped and further resists\n         the crushing pressure).  The solution for crushing pressure in the VPM\n         permeable range is a simple linear equation.  In the VPM impermeable\n         range, a cubic equation must be solved using a numerical method.\n\n         Separate crushing pressures are tracked for helium and nitrogen because\n         they can have different critical radii.  The crushing pressures will be\n         the same for helium and nitrogen in the permeable range of the model, but\n         they will start to diverge in the impermeable range.  This is due to\n         the differences between starting radius, radius at the onset of\n         impermeability, and radial compression in the impermeable range.\n\n         Side Effects: Sets\n         `self.Max_Crushing_Pressure_He`,\n         `self.Max_Crushing_Pressure_N2`\n\n         Returns: None\n         ';
      gradient_onset_of_imperm = self.settings_values.Gradient_Onset_of_Imperm_Atm * self.Units_Factor;
      gradient_onset_of_imperm_pa = self.settings_values.Gradient_Onset_of_Imperm_Atm * self.ATM;
      starting_ambient_pressure = starting_depth + self.Barometric_Pressure;
      ending_ambient_pressure = ending_depth + self.Barometric_Pressure;
      for (i = 0; i < ARRAY_LENGTH; i++) {
        starting_gas_tension = self.Initial_Helium_Pressure[i] + self.Initial_Nitrogen_Pressure[i] + self.Constant_Pressure_Other_Gases;
        starting_gradient = starting_ambient_pressure - starting_gas_tension;
        ending_gas_tension = self.Helium_Pressure[i] + self.Nitrogen_Pressure[i] + self.Constant_Pressure_Other_Gases;
        ending_gradient = ending_ambient_pressure - ending_gas_tension;
        radius_onset_of_imperm_he = 1 / (gradient_onset_of_imperm_pa / (2 * (self.settings_values.Skin_Compression_GammaC - self.settings_values.Surface_Tension_Gamma)) + 1 / self.Adjusted_Critical_Radius_He[i]);
        radius_onset_of_imperm_n2 = 1 / (gradient_onset_of_imperm_pa / (2 * (self.settings_values.Skin_Compression_GammaC - self.settings_values.Surface_Tension_Gamma)) + 1 / self.Adjusted_Critical_Radius_N2[i]);
        if (ending_gradient <= gradient_onset_of_imperm) {
          crushing_pressure_he = ending_ambient_pressure - ending_gas_tension;
          crushing_pressure_n2 = ending_ambient_pressure - ending_gas_tension;
        } else {
          if (starting_gradient === gradient_onset_of_imperm) {
            self.Amb_Pressure_Onset_of_Imperm[i] = starting_ambient_pressure;
            self.Gas_Tension_Onset_of_Imperm[i] = starting_gas_tension;
          }
          if (starting_gradient < gradient_onset_of_imperm) {
            self.onset_of_impermeability(starting_ambient_pressure, ending_ambient_pressure, rate, i);
          }
          ending_ambient_pressure_pa = ending_ambient_pressure / self.Units_Factor * self.ATM;
          amb_press_onset_of_imperm_pa = self.Amb_Pressure_Onset_of_Imperm[i] / self.Units_Factor * self.ATM;
          gas_tension_onset_of_imperm_pa = self.Gas_Tension_Onset_of_Imperm[i] / self.Units_Factor * self.ATM;
          crushing_pressure_he = self._crushing_pressure_helper(radius_onset_of_imperm_he, ending_ambient_pressure_pa, amb_press_onset_of_imperm_pa, gas_tension_onset_of_imperm_pa, gradient_onset_of_imperm_pa);
          crushing_pressure_n2 = self._crushing_pressure_helper(radius_onset_of_imperm_n2, ending_ambient_pressure_pa, amb_press_onset_of_imperm_pa, gas_tension_onset_of_imperm_pa, gradient_onset_of_imperm_pa);
        }
        self.Max_Crushing_Pressure_He[i] = max(self.Max_Crushing_Pressure_He[i], crushing_pressure_he);
        self.Max_Crushing_Pressure_N2[i] = max(self.Max_Crushing_Pressure_N2[i], crushing_pressure_n2);
      }
    };
    DiveState.prototype.onset_of_impermeability = function onset_of_impermeability(starting_ambient_pressure, ending_ambient_pressure, rate, i) {
      var self = this;
      var gradient_onset_of_imperm, initial_inspired_he_pressure, initial_inspired_n2_pressure, helium_rate, nitrogen_rate, low_bound, high_bound, starting_gas_tension, function_at_low_bound, high_bound_helium_pressure, high_bound_nitrogen_pressure, ending_gas_tension, function_at_high_bound, last_diff_change, differential_change, mid_range_time, mid_range_ambient_pressure, mid_range_helium_pressure, mid_range_nitrogen_pressure, gas_tension_at_mid_range, function_at_mid_range, time, j;
      '\n        Purpose:  This subroutine uses the Bisection Method to find the ambient\n        pressure and gas tension at the onset of impermeability for a given\n        compartment.  Source:  "Numerical Recipes in Fortran 77",\n        Cambridge University Press, 1992.\n\n        Side Effects: Sets\n        `self.Amb_Pressure_Onset_of_Imperm`,\n        `self.Gas_Tension_Onset_of_Imperm`\n\n        or\n\n        Raises a RootException\n\n        Returns: None\n        ';
      gradient_onset_of_imperm = self.Gradient_Onset_of_Imperm_Atm * self.Units_Factor;
      initial_inspired_he_pressure = (starting_ambient_pressure - self.Water_Vapor_Pressure) * self.Fraction_Helium[self.Mix_Number - 1];
      initial_inspired_n2_pressure = (starting_ambient_pressure - self.Water_Vapor_Pressure) * self.Fraction_Nitrogen[self.Mix_Number - 1];
      helium_rate = rate * self.Fraction_Helium[self.Mix_Number - 1];
      nitrogen_rate = rate * self.Fraction_Nitrogen[self.Mix_Number - 1];
      low_bound = 0;
      high_bound = (ending_ambient_pressure - starting_ambient_pressure) / rate;
      starting_gas_tension = self.Initial_Helium_Pressure[i] + self.Initial_Nitrogen_Pressure[i] + self.Constant_Pressure_Other_Gases;
      function_at_low_bound = starting_ambient_pressure - starting_gas_tension - gradient_onset_of_imperm;
      high_bound_helium_pressure = schreiner_equation(initial_inspired_he_pressure, helium_rate, high_bound, self.Helium_Time_Constant[i], self.Initial_Helium_Pressure[i]);
      high_bound_nitrogen_pressure = schreiner_equation(initial_inspired_n2_pressure, nitrogen_rate, high_bound, self.Nitrogen_Time_Constant[i], self.Initial_Nitrogen_Pressure[i]);
      ending_gas_tension = high_bound_helium_pressure + high_bound_nitrogen_pressure + self.Constant_Pressure_Other_Gases;
      function_at_high_bound = ending_ambient_pressure - ending_gas_tension - gradient_onset_of_imperm;
      if (function_at_high_bound * function_at_low_bound >= 0) {
        throw new RootException('ERROR! ROOT IS NOT WITHIN BRACKETS. Source:onset_of_impermeability. Values - highbound: ' + function_at_high_bound + " lowbound: " + function_at_low_bound);
      }
      if (function_at_low_bound < 0) {
        time = low_bound;
        differential_change = high_bound - low_bound;
      } else {
        time = high_bound;
        differential_change = low_bound - high_bound;
      }
      for (j = 0; j < 100; j++) {
        last_diff_change = differential_change;
        differential_change = last_diff_change * 0.5;
        mid_range_time = time + differential_change;
        mid_range_ambient_pressure = starting_ambient_pressure + rate * mid_range_time;
        mid_range_helium_pressure = schreiner_equation(initial_inspired_he_pressure, helium_rate, mid_range_time, self.Helium_Time_Constant[i], self.Initial_Helium_Pressure[i]);
        mid_range_nitrogen_pressure = schreiner_equation(initial_inspired_n2_pressure, nitrogen_rate, mid_range_time, self.Nitrogen_Time_Constant[i], self.Initial_Nitrogen_Pressure[i]);
        gas_tension_at_mid_range = mid_range_helium_pressure + mid_range_nitrogen_pressure + self.Constant_Pressure_Other_Gases;
        function_at_mid_range = mid_range_ambient_pressure - gas_tension_at_mid_range - gradient_onset_of_imperm;
        if (function_at_mid_range <= 0) {
          time = mid_range_time;
        }
        if (abs(differential_change) < 0.001 || function_at_mid_range === 0) {
          break;
        }
      }
      self.Amb_Pressure_Onset_of_Imperm[i] = mid_range_ambient_pressure;
      self.Gas_Tension_Onset_of_Imperm[i] = gas_tension_at_mid_range;
    };
    DiveState.prototype.gas_loadings_constant_depth = function gas_loadings_constant_depth(depth, run_time_end_of_segment) {
      var self = this;
      var ambient_pressure, inspired_helium_pressure, inspired_nitrogen_pressure, temp_helium_pressure, temp_nitrogen_pressure, i;
      '\n        Purpose: This subprogram applies the Haldane equation to update the\n        gas loadings (partial pressures of helium and nitrogen) in the half-time\n        compartments for a segment at constant depth.\n\n        Side Effects: Sets\n        `self.Ending_Ambient_Pressure`,\n        `self.Helium_Pressure`,\n        `self.Nitrogen_Pressure`\n        `self.Run_Time`,\n        `self.Segment_Number`,\n        `self.Segment_Time`,\n\n        Returns: None\n        ';
      self.Segment_Time = run_time_end_of_segment - self.Run_Time;
      self.Run_Time = run_time_end_of_segment;
      self.Segment_Number += 1;
      ambient_pressure = depth + self.Barometric_Pressure;
      inspired_helium_pressure = (ambient_pressure - self.Water_Vapor_Pressure) * self.Fraction_Helium[self.Mix_Number - 1];
      inspired_nitrogen_pressure = (ambient_pressure - self.Water_Vapor_Pressure) * self.Fraction_Nitrogen[self.Mix_Number - 1];
      self.Ending_Ambient_Pressure = ambient_pressure;
      for (i = 0; i < ARRAY_LENGTH; i++) {
        temp_helium_pressure = self.Helium_Pressure[i];
        temp_nitrogen_pressure = self.Nitrogen_Pressure[i];
        self.Helium_Pressure[i] = haldane_equation(temp_helium_pressure, inspired_helium_pressure, self.Helium_Time_Constant[i], self.Segment_Time);
        self.Nitrogen_Pressure[i] = haldane_equation(temp_nitrogen_pressure, inspired_nitrogen_pressure, self.Nitrogen_Time_Constant[i], self.Segment_Time);
      }
    };
    DiveState.prototype.nuclear_regeneration = function nuclear_regeneration(dive_time) {
      var self = this;
      var crushing_pressure_pascals_he, crushing_pressure_pascals_n2, ending_radius_he, ending_radius_n2, crush_pressure_adjust_ratio_he, crush_pressure_adjust_ratio_n2, adj_crush_pressure_he_pascals, adj_crush_pressure_n2_pascals, i;
      '\n        Purpose: This subprogram calculates the regeneration of VPM critical\n        radii that takes place over the dive time.  The regeneration time constant\n        has a time scale of weeks so this will have very little impact on dives of\n        normal length, but will have a major impact for saturation dives.\n\n        Side Effects: Sets\n        `self.Adjusted_Crushing_Pressure_He`,\n        `self.Adjusted_Crushing_Pressure_N2`\n        `self.Regenerated_Radius_He`,\n        `self.Regenerated_Radius_N2`,\n\n        Returns: None\n        ';
      for (i = 0; i < ARRAY_LENGTH; i++) {
        crushing_pressure_pascals_he = self.Max_Crushing_Pressure_He[i] / self.Units_Factor * self.ATM;
        crushing_pressure_pascals_n2 = self.Max_Crushing_Pressure_N2[i] / self.Units_Factor * self.ATM;
        ending_radius_he = 1 / (crushing_pressure_pascals_he / (2 * (self.settings_values.Skin_Compression_GammaC - self.settings_values.Surface_Tension_Gamma)) + 1 / self.Adjusted_Critical_Radius_He[i]);
        ending_radius_n2 = 1 / (crushing_pressure_pascals_n2 / (2 * (self.settings_values.Skin_Compression_GammaC - self.settings_values.Surface_Tension_Gamma)) + 1 / self.Adjusted_Critical_Radius_N2[i]);
        self.Regenerated_Radius_He[i] = self.Adjusted_Critical_Radius_He[i] + (ending_radius_he - self.Adjusted_Critical_Radius_He[i]) * Math.exp(-dive_time / self.settings_values.Regeneration_Time_Constant);
        self.Regenerated_Radius_N2[i] = self.Adjusted_Critical_Radius_N2[i] + (ending_radius_n2 - self.Adjusted_Critical_Radius_N2[i]) * Math.exp(-dive_time / self.settings_values.Regeneration_Time_Constant);
        crush_pressure_adjust_ratio_he = ending_radius_he * (self.Adjusted_Critical_Radius_He[i] - self.Regenerated_Radius_He[i]) / (self.Regenerated_Radius_He[i] * (self.Adjusted_Critical_Radius_He[i] - ending_radius_he));
        crush_pressure_adjust_ratio_n2 = ending_radius_n2 * (self.Adjusted_Critical_Radius_N2[i] - self.Regenerated_Radius_N2[i]) / (self.Regenerated_Radius_N2[i] * (self.Adjusted_Critical_Radius_N2[i] - ending_radius_n2));
        adj_crush_pressure_he_pascals = crushing_pressure_pascals_he * crush_pressure_adjust_ratio_he;
        adj_crush_pressure_n2_pascals = crushing_pressure_pascals_n2 * crush_pressure_adjust_ratio_n2;
        self.Adjusted_Crushing_Pressure_He[i] = adj_crush_pressure_he_pascals / self.ATM * self.Units_Factor;
        self.Adjusted_Crushing_Pressure_N2[i] = adj_crush_pressure_n2_pascals / self.ATM * self.Units_Factor;
      }
    };
    DiveState.prototype.calc_initial_allowable_gradient = function calc_initial_allowable_gradient() {
      var self = this;
      var initial_allowable_grad_n2_pa, initial_allowable_grad_he_pa, i;
      '\n        Purpose: This subprogram calculates the initial allowable gradients for\n        helium and nitrogen in each compartment.  These are the gradients that\n        will be used to set the deco ceiling on the first pass through the deco\n        loop.  If the Critical Volume Algorithm is set to "off", then these\n        gradients will determine the final deco schedule.  Otherwise, if the\n        Critical Volume Algorithm is set to "on", these gradients will be further\n        "relaxed" by the Critical Volume Algorithm subroutine.  The initial\n        allowable gradients are referred to as "PssMin" in the papers by Yount\n        and colleagues, i.e., the minimum supersaturation pressure gradients\n        that will probe bubble formation in the VPM nuclei that started with the\n        designated minimum initial radius (critical radius).\n\n        The initial allowable gradients are computed directly from the\n        "regenerated" radii after the Nuclear Regeneration subroutine.  These\n        gradients are tracked separately for helium and nitrogen.\n\n        Side Effects: Sets\n        `self.Allowable_Gradient_He`,\n        `self.Allowable_Gradient_N2`\n        `self.Initial_Allowable_Gradient_He`,\n        `self.Initial_Allowable_Gradient_N2`,\n\n        Returns: None\n        ';
      for (i = 0; i < ARRAY_LENGTH; i++) {
        initial_allowable_grad_n2_pa = 2 * self.settings_values.Surface_Tension_Gamma * (self.settings_values.Skin_Compression_GammaC - self.settings_values.Surface_Tension_Gamma) / (self.Regenerated_Radius_N2[i] * self.settings_values.Skin_Compression_GammaC);
        initial_allowable_grad_he_pa = 2 * self.settings_values.Surface_Tension_Gamma * (self.settings_values.Skin_Compression_GammaC - self.settings_values.Surface_Tension_Gamma) / (self.Regenerated_Radius_He[i] * self.settings_values.Skin_Compression_GammaC);
        self.Initial_Allowable_Gradient_N2[i] = initial_allowable_grad_n2_pa / self.ATM * self.Units_Factor;
        self.Initial_Allowable_Gradient_He[i] = initial_allowable_grad_he_pa / self.ATM * self.Units_Factor;
        self.Allowable_Gradient_He[i] = self.Initial_Allowable_Gradient_He[i];
        self.Allowable_Gradient_N2[i] = self.Initial_Allowable_Gradient_N2[i];
      }
    };
    DiveState.prototype.calc_start_of_deco_zone = function calc_start_of_deco_zone(starting_depth, rate) {
      var self = this;
      var starting_ambient_pressure, initial_inspired_he_pressure, initial_inspired_n2_pressure, helium_rate, nitrogen_rate, low_bound, high_bound, initial_helium_pressure, initial_nitrogen_pressure, function_at_low_bound, high_bound_helium_pressure, high_bound_nitrogen_pressure, function_at_high_bound, last_diff_change, differential_change, mid_range_time, mid_range_helium_pressure, mid_range_nitrogen_pressure, function_at_mid_range, time_to_start_of_deco_zone, j, cpt_depth_start_of_deco_zone, i;
      '\n        Purpose: This subroutine uses the Bisection Method to find the depth at\n        which the leading compartment just enters the decompression zone.\n        Source:  "Numerical Recipes in Fortran 77", Cambridge University Press,\n        1992.\n\n        Side Effects: Sets\n        `self.Depth_Start_of_Deco_Zone`\n\n        or\n\n        Raises a RootException\n\n        Returns: None\n        ';
      self.Depth_Start_of_Deco_Zone = 0;
      starting_ambient_pressure = starting_depth + self.Barometric_Pressure;
      initial_inspired_he_pressure = (starting_ambient_pressure - self.Water_Vapor_Pressure) * self.Fraction_Helium[self.Mix_Number - 1];
      initial_inspired_n2_pressure = (starting_ambient_pressure - self.Water_Vapor_Pressure) * self.Fraction_Nitrogen[self.Mix_Number - 1];
      helium_rate = rate * self.Fraction_Helium[self.Mix_Number - 1];
      nitrogen_rate = rate * self.Fraction_Nitrogen[self.Mix_Number - 1];
      low_bound = 0;
      high_bound = -1 * (starting_ambient_pressure / rate);
      for (i = 0; i < ARRAY_LENGTH; i++) {
        initial_helium_pressure = self.Helium_Pressure[i];
        initial_nitrogen_pressure = self.Nitrogen_Pressure[i];
        function_at_low_bound = initial_helium_pressure + initial_nitrogen_pressure + self.Constant_Pressure_Other_Gases - starting_ambient_pressure;
        high_bound_helium_pressure = schreiner_equation(initial_inspired_he_pressure, helium_rate, high_bound, self.Helium_Time_Constant[i], initial_helium_pressure);
        high_bound_nitrogen_pressure = schreiner_equation(initial_inspired_n2_pressure, nitrogen_rate, high_bound, self.Nitrogen_Time_Constant[i], initial_nitrogen_pressure);
        function_at_high_bound = high_bound_helium_pressure + high_bound_nitrogen_pressure + self.Constant_Pressure_Other_Gases;
        if (function_at_high_bound * function_at_low_bound >= 0) {
          //throw new RootException('ERROR! ROOT IS NOT WITHIN BRACKETS. Source:calc_start_of_deco_zone. Values - highbound: ' + function_at_high_bound + " lowbound: " + function_at_low_bound);
          this.Depth_Start_of_Deco_Zone = starting_depth; //Bound start of deco zone to starting depth
          console.log("WARNING: This dive moves you too shallow past what the leading compartment (number " + i +") allows for.");
        }
        if (function_at_low_bound < 0) {
          time_to_start_of_deco_zone = low_bound;
          differential_change = high_bound - low_bound;
        } else {
          time_to_start_of_deco_zone = high_bound;
          differential_change = low_bound - high_bound;
        }
        for (j = 0; j < 100; j++) {
          last_diff_change = differential_change;
          differential_change = last_diff_change * 0.5;
          mid_range_time = time_to_start_of_deco_zone + differential_change;
          mid_range_helium_pressure = schreiner_equation(initial_inspired_he_pressure, helium_rate, mid_range_time, self.Helium_Time_Constant[i], initial_helium_pressure);
          mid_range_nitrogen_pressure = schreiner_equation(initial_inspired_n2_pressure, nitrogen_rate, mid_range_time, self.Nitrogen_Time_Constant[i], initial_nitrogen_pressure);
          function_at_mid_range = mid_range_helium_pressure + mid_range_nitrogen_pressure + self.Constant_Pressure_Other_Gases - (starting_ambient_pressure + rate * mid_range_time);
          if (function_at_mid_range <= 0) {
            time_to_start_of_deco_zone = mid_range_time;
          }
          if (abs(differential_change) < 0.001 || function_at_mid_range === 0) {
            break;
          }
          if (j === 100) {
            throw new MaxIterationException('ERROR! ROOT SEARCH EXCEEDED MAXIMUM ITERATIONS');
          }
        }
        cpt_depth_start_of_deco_zone = starting_ambient_pressure + rate * time_to_start_of_deco_zone - self.Barometric_Pressure;
        self.Depth_Start_of_Deco_Zone = max(self.Depth_Start_of_Deco_Zone, cpt_depth_start_of_deco_zone);
      }
    };
    DiveState.prototype.calc_ascent_ceiling = function calc_ascent_ceiling() {
      var self = this;
      var compartment_ascent_ceiling, gas_loading, weighted_allowable_gradient, tolerated_ambient_pressure, i;
      '\n        Purpose: This subprogram calculates the ascent ceiling (the safe ascent\n        depth) in each compartment, based on the allowable gradients, and then\n        finds the deepest ascent ceiling across all compartments.\n\n        Side Effects: Sets\n        `self.Ascent_Ceiling_Depth`\n\n        Returns: None\n        ';
      compartment_ascent_ceiling = new Array(ARRAY_LENGTH);
      for (i = 0; i < ARRAY_LENGTH; i++) {
        gas_loading = self.Helium_Pressure[i] + self.Nitrogen_Pressure[i];
        if (gas_loading > 0) {
          weighted_allowable_gradient = (self.Allowable_Gradient_He[i] * self.Helium_Pressure[i] + self.Allowable_Gradient_N2[i] * self.Nitrogen_Pressure[i]) / (self.Helium_Pressure[i] + self.Nitrogen_Pressure[i]);
          tolerated_ambient_pressure = gas_loading + self.Constant_Pressure_Other_Gases - weighted_allowable_gradient;
        } else {
          weighted_allowable_gradient = min(self.Allowable_Gradient_He[i], self.Allowable_Gradient_N2[i]);
          tolerated_ambient_pressure = self.Constant_Pressure_Other_Gases - weighted_allowable_gradient;
        }
        if (tolerated_ambient_pressure < 0) {
          tolerated_ambient_pressure = 0;
        }
        compartment_ascent_ceiling[i] = tolerated_ambient_pressure - self.Barometric_Pressure;
      }
      self.Ascent_Ceiling_Depth = max(compartment_ascent_ceiling);
    };
    DiveState.prototype.projected_ascent = function projected_ascent(starting_depth, rate, step_size) {
      var self = this;
      var starting_ambient_pressure, initial_inspired_he_pressure, initial_inspired_n2_pressure, helium_rate, nitrogen_rate, temp_gas_loading, allowable_gas_loading, initial_helium_pressure, initial_nitrogen_pressure, ending_ambient_pressure, segment_time, temp_helium_pressure, temp_nitrogen_pressure, weighted_allowable_gradient, i, new_ambient_pressure, end_sub, j;
      '\n        Purpose: This subprogram performs a simulated ascent outside of the main\n        program to ensure that a deco ceiling will not be violated due to unusual\n        gas loading during ascent (on-gassing).  If the deco ceiling is violated,\n        the stop depth will be adjusted deeper by the step size until a safe\n        ascent can be made.\n\n        Side Effects: Sets\n        `self.Deco_Stop_Depth`\n\n        Returns: None\n        ';
      new_ambient_pressure = self.Deco_Stop_Depth + self.Barometric_Pressure;
      starting_ambient_pressure = starting_depth + self.Barometric_Pressure;
      initial_inspired_he_pressure = (starting_ambient_pressure - self.Water_Vapor_Pressure) * self.Fraction_Helium[self.Mix_Number - 1];
      initial_inspired_n2_pressure = (starting_ambient_pressure - self.Water_Vapor_Pressure) * self.Fraction_Nitrogen[self.Mix_Number - 1];
      helium_rate = rate * self.Fraction_Helium[self.Mix_Number - 1];
      nitrogen_rate = rate * self.Fraction_Nitrogen[self.Mix_Number - 1];
      temp_gas_loading = new Array(ARRAY_LENGTH);
      allowable_gas_loading = new Array(ARRAY_LENGTH);
      initial_helium_pressure = new Array(ARRAY_LENGTH);
      initial_nitrogen_pressure = new Array(ARRAY_LENGTH);
      for (i = 0; i < ARRAY_LENGTH; i++) {
        initial_helium_pressure[i] = self.Helium_Pressure[i];
        initial_nitrogen_pressure[i] = self.Nitrogen_Pressure[i];
      }
      while (true) {
        ending_ambient_pressure = new_ambient_pressure;
        segment_time = (ending_ambient_pressure - starting_ambient_pressure) / rate;
        for (i = 0; i < ARRAY_LENGTH; i++) {
          temp_helium_pressure = schreiner_equation(initial_inspired_he_pressure, helium_rate, segment_time, self.Helium_Time_Constant[i], initial_helium_pressure[i]);
          temp_nitrogen_pressure = schreiner_equation(initial_inspired_n2_pressure, nitrogen_rate, segment_time, self.Nitrogen_Time_Constant[i], initial_nitrogen_pressure[i]);
          temp_gas_loading[i] = temp_helium_pressure + temp_nitrogen_pressure;
          if (temp_gas_loading[i] > 0) {
            weighted_allowable_gradient = (self.Allowable_Gradient_He[i] * temp_helium_pressure + self.Allowable_Gradient_N2[i] * temp_nitrogen_pressure) / temp_gas_loading[i];
          } else {
            weighted_allowable_gradient = min(self.Allowable_Gradient_He[i], self.Allowable_Gradient_N2[i]);
          }
          allowable_gas_loading[i] = ending_ambient_pressure + weighted_allowable_gradient - self.Constant_Pressure_Other_Gases;
        }
        end_sub = true;
        for (j = 0; j < ARRAY_LENGTH; j++) {
          if (temp_gas_loading[j] > allowable_gas_loading[j]) {
            new_ambient_pressure = ending_ambient_pressure + step_size;
            self.Deco_Stop_Depth = self.Deco_Stop_Depth + step_size;
            end_sub = false;
            break;
          }
        }
        if (!end_sub) {
          continue;
        } else {
          break;
        }
      }
    };
    DiveState.prototype._calculate_deco_gradient = function _calculate_deco_gradient(allowable_gradient_molecule, amb_press_first_stop_pascals, amb_press_next_stop_pascals) {
      var self = this;
      var allow_grad_first_stop_pa, radius_first_stop, A, B, C, low_bound, high_bound, ending_radius, deco_gradient_pascals;
      'Calculates the decompression gradient for Boyles_Law_Compensation.\n\n        Side Effects: None\n\n        Returns: A floating point value\n        ';
      allow_grad_first_stop_pa = allowable_gradient_molecule / self.Units_Factor * self.ATM;
      radius_first_stop = 2 * self.Surface_Tension_Gamma / allow_grad_first_stop_pa;
      A = amb_press_next_stop_pascals;
      B = -2 * self.Surface_Tension_Gamma;
      C = (amb_press_first_stop_pascals + 2 * self.Surface_Tension_Gamma / radius_first_stop) * radius_first_stop * radius_first_stop * radius_first_stop;
      low_bound = radius_first_stop;
      high_bound = radius_first_stop * Math.pow(amb_press_first_stop_pascals / amb_press_next_stop_pascals, 1 / 3);
      ending_radius = radius_root_finder(A, B, C, low_bound, high_bound);
      deco_gradient_pascals = 2 * self.Surface_Tension_Gamma / ending_radius;
      return deco_gradient_pascals / self.ATM * self.Units_Factor;
    };
    DiveState.prototype.boyles_law_compensation = function boyles_law_compensation(first_stop_depth, deco_stop_depth, step_size) {
      var self = this;
      var next_stop, ambient_pressure_first_stop, ambient_pressure_next_stop, amb_press_first_stop_pascals, amb_press_next_stop_pascals, i;
      '\n        Purpose: This subprogram calculates the reduction in allowable gradients\n        with decreasing ambient pressure during the decompression profile based\n        on Boyle\'s Law considerations.\n\n        Side Effects: Sets\n        `self.Deco_Gradient_He`,\n        `self.Deco_Gradient_N2`\n\n        Returns: None\n        ';
      next_stop = deco_stop_depth - step_size;
      ambient_pressure_first_stop = first_stop_depth + self.Barometric_Pressure;
      ambient_pressure_next_stop = next_stop + self.Barometric_Pressure;
      amb_press_first_stop_pascals = ambient_pressure_first_stop / self.Units_Factor * self.ATM;
      amb_press_next_stop_pascals = ambient_pressure_next_stop / self.Units_Factor * self.ATM;
      for (i = 0; i < ARRAY_LENGTH; i++) {
        self.Deco_Gradient_He[i] = self._calculate_deco_gradient(self.Allowable_Gradient_He[i], amb_press_first_stop_pascals, amb_press_next_stop_pascals);
        self.Deco_Gradient_N2[i] = self._calculate_deco_gradient(self.Allowable_Gradient_N2[i], amb_press_first_stop_pascals, amb_press_next_stop_pascals);
      }
    };
    DiveState.prototype.decompression_stop = function decompression_stop(deco_stop_depth, step_size) {
      var self = this;
      var round_up_operation, ambient_pressure, next_stop, inspired_helium_pressure, inspired_nitrogen_pressure, weighted_allowable_gradient, initial_helium_pressure, initial_nitrogen_pressure, i, deco_ceiling_depth, time_counter, temp_segment_time, last_run_time;
      '\n        Purpose: This subprogram calculates the required time at each\n        decompression stop.\n\n        Side Effects: Sets\n        `self.Ending_Ambient_Pressure`,\n        `self.Helium_Pressure`,\n        `self.Nitrogen_Pressure`\n        `self.Run_Time`,\n        `self.Segment_Number`,\n        `self.Segment_Time`,\n\n        or\n\n        Raises an OffGassingException\n\n        Returns: None\n        ';
      last_run_time = self.Run_Time;
      round_up_operation = Math.round(last_run_time / self.Minimum_Deco_Stop_Time + 0.5) * self.Minimum_Deco_Stop_Time;
      self.Segment_Time = round_up_operation - self.Run_Time;
      self.Run_Time = round_up_operation;
      temp_segment_time = self.Segment_Time;
      self.Segment_Number += 1;
      ambient_pressure = deco_stop_depth + self.Barometric_Pressure;
      self.Ending_Ambient_Pressure = ambient_pressure;
      next_stop = deco_stop_depth - step_size;
      inspired_helium_pressure = (ambient_pressure - self.Water_Vapor_Pressure) * self.Fraction_Helium[self.Mix_Number - 1];
      inspired_nitrogen_pressure = (ambient_pressure - self.Water_Vapor_Pressure) * self.Fraction_Nitrogen[self.Mix_Number - 1];
      for (i = 0; i < ARRAY_LENGTH; i++) {
        if (inspired_helium_pressure + inspired_nitrogen_pressure > 0) {
          weighted_allowable_gradient = (self.Deco_Gradient_He[i] * inspired_helium_pressure + self.Deco_Gradient_N2[i] * inspired_nitrogen_pressure) / (inspired_helium_pressure + inspired_nitrogen_pressure);
          if (inspired_helium_pressure + inspired_nitrogen_pressure + self.Constant_Pressure_Other_Gases - weighted_allowable_gradient > next_stop + self.Barometric_Pressure) {
            throw new OffGassingException('ERROR! OFF-GASSING GRADIENT IS TOO SMALL TO DECOMPRESS AT THE %f STOP. Next stop: %f' % [
              deco_stop_depth,
              next_stop
            ]);
          }
        }
      }
      while (true) {
        for (i = 0; i < ARRAY_LENGTH; i++) {
          initial_helium_pressure = self.Helium_Pressure[i];
          initial_nitrogen_pressure = self.Nitrogen_Pressure[i];
          self.Helium_Pressure[i] = haldane_equation(initial_helium_pressure, inspired_helium_pressure, self.Helium_Time_Constant[i], self.Segment_Time);
          self.Nitrogen_Pressure[i] = haldane_equation(initial_nitrogen_pressure, inspired_nitrogen_pressure, self.Nitrogen_Time_Constant[i], self.Segment_Time);
        }
        deco_ceiling_depth = self.calc_deco_ceiling();
        if (deco_ceiling_depth > next_stop) {
          self.Segment_Time = self.Minimum_Deco_Stop_Time;
          time_counter = temp_segment_time;
          temp_segment_time = time_counter + self.Minimum_Deco_Stop_Time;
          last_run_time = self.Run_Time;
          self.Run_Time = last_run_time + self.Minimum_Deco_Stop_Time;
          continue;
        }
        break;
      }
      self.Segment_Time = temp_segment_time;
    };
    DiveState.prototype.calc_deco_ceiling = function calc_deco_ceiling() {
      var self = this;
      var compartment_deco_ceiling, gas_loading, weighted_allowable_gradient, tolerated_ambient_pressure, i, deco_ceiling_depth;
      '\n        Purpose: This subprogram calculates the deco ceiling (the safe ascent\n        depth) in each compartment, based on the allowable "deco gradients"\n        computed in the Boyle\'s Law Compensation subroutine, and then finds the\n        deepest deco ceiling across all compartments.  This deepest value\n        (Deco Ceiling Depth) is then used by the Decompression Stop subroutine\n        to determine the actual deco schedule.\n\n        Side Effects: None\n\n        Returns: `self.deco_ceiling_depth`\n        ';
      compartment_deco_ceiling = new Array(ARRAY_LENGTH);
      for (i = 0; i < ARRAY_LENGTH; i++) {
        gas_loading = self.Helium_Pressure[i] + self.Nitrogen_Pressure[i];
        if (gas_loading > 0) {
          weighted_allowable_gradient = (self.Deco_Gradient_He[i] * self.Helium_Pressure[i] + self.Deco_Gradient_N2[i] * self.Nitrogen_Pressure[i]) / (self.Helium_Pressure[i] + self.Nitrogen_Pressure[i]);
          tolerated_ambient_pressure = gas_loading + self.Constant_Pressure_Other_Gases - weighted_allowable_gradient;
        } else {
          weighted_allowable_gradient = min(self.Deco_Gradient_He[i], self.Deco_Gradient_N2[i]);
          tolerated_ambient_pressure = self.Constant_Pressure_Other_Gases - weighted_allowable_gradient;
        }
        if (tolerated_ambient_pressure < 0) {
          tolerated_ambient_pressure = 0;
        }
        compartment_deco_ceiling[i] = tolerated_ambient_pressure - self.Barometric_Pressure;
      }
      deco_ceiling_depth = max(compartment_deco_ceiling);
      return deco_ceiling_depth;
    };
    DiveState.prototype.critical_volume = function critical_volume(deco_phase_volume_time) {
      var self = this;
      var parameter_lambda_pascals, phase_volume_time, adj_crush_pressure_he_pascals, initial_allowable_grad_he_pa, new_allowable_grad_he_pascals, adj_crush_pressure_n2_pascals, initial_allowable_grad_n2_pa, B, C, new_allowable_grad_n2_pascals, i;
      '\n        Purpose: This subprogram applies the VPM Critical Volume Algorithm.  This\n        algorithm will compute "relaxed" gradients for helium and nitrogen based\n        on the setting of the Critical Volume Parameter Lambda.\n\n        Side Effects: Sets\n        `self.Allowable_Gradient_He`,\n        `self.Allowable_Gradient_N2`\n\n        Returns: None\n        ';
      parameter_lambda_pascals = self.Crit_Volume_Parameter_Lambda / 33 * self.ATM;
      for (i = 0; i < ARRAY_LENGTH; i++) {
        phase_volume_time = deco_phase_volume_time + self.Surface_Phase_Volume_Time[i];
        adj_crush_pressure_he_pascals = self.Adjusted_Crushing_Pressure_He[i] / self.Units_Factor * self.ATM;
        initial_allowable_grad_he_pa = self.Initial_Allowable_Gradient_He[i] / self.Units_Factor * self.ATM;
        B = initial_allowable_grad_he_pa + parameter_lambda_pascals * self.Surface_Tension_Gamma / (self.Skin_Compression_GammaC * phase_volume_time);
        C = self.Surface_Tension_Gamma * self.Surface_Tension_Gamma * parameter_lambda_pascals * adj_crush_pressure_he_pascals / (self.Skin_Compression_GammaC * self.Skin_Compression_GammaC * phase_volume_time);
        new_allowable_grad_he_pascals = (B + Math.sqrt(Math.pow(B, 2) - 4 * C)) / 2;
        self.Allowable_Gradient_He[i] = new_allowable_grad_he_pascals / self.ATM * self.Units_Factor;
        adj_crush_pressure_n2_pascals = self.Adjusted_Crushing_Pressure_N2[i] / self.Units_Factor * self.ATM;
        initial_allowable_grad_n2_pa = self.Initial_Allowable_Gradient_N2[i] / self.Units_Factor * self.ATM;
        B = initial_allowable_grad_n2_pa + parameter_lambda_pascals * self.Surface_Tension_Gamma / (self.Skin_Compression_GammaC * phase_volume_time);
        C = self.Surface_Tension_Gamma * self.Surface_Tension_Gamma * parameter_lambda_pascals * adj_crush_pressure_n2_pascals / (self.Skin_Compression_GammaC * self.Skin_Compression_GammaC * phase_volume_time);
        new_allowable_grad_n2_pascals = (B + Math.sqrt(Math.pow(B, 2) - 4 * C)) / 2;
        self.Allowable_Gradient_N2[i] = new_allowable_grad_n2_pascals / self.ATM * self.Units_Factor;
      }
    };
    DiveState.prototype.calc_surface_phase_volume_time = function calc_surface_phase_volume_time() {
      var self = this;
      var surface_inspired_n2_pressure, decay_time_to_zero_gradient, integral_gradient_x_time, i;
      '\n        Purpose: This subprogram computes the surface portion of the total phase\n        volume time.  This is the time factored out of the integration of\n        supersaturation gradient x time over the surface interval.  The VPM\n        considers the gradients that allow bubbles to form or to drive bubble\n        growth both in the water and on the surface after the dive.\n\n        This subroutine is a new development to the VPM algorithm in that it\n        computes the time course of supersaturation gradients on the surface\n        when both helium and nitrogen are present.  Refer to separate write-up\n        for a more detailed explanation of this algorithm.\n\n        Side Effects: Sets\n        `self.Surface_Phase_Volume_Time`\n\n        Returns: None\n        ';
      surface_inspired_n2_pressure = (self.Barometric_Pressure - self.Water_Vapor_Pressure) * self.fraction_inert_gas;
      for (i = 0; i < ARRAY_LENGTH; i++) {
        if (self.Nitrogen_Pressure[i] > surface_inspired_n2_pressure) {
          self.Surface_Phase_Volume_Time[i] = (self.Helium_Pressure[i] / self.Helium_Time_Constant[i] + (self.Nitrogen_Pressure[i] - surface_inspired_n2_pressure) / self.Nitrogen_Time_Constant[i]) / (self.Helium_Pressure[i] + self.Nitrogen_Pressure[i] - surface_inspired_n2_pressure);
        } else if (self.Nitrogen_Pressure[i] <= surface_inspired_n2_pressure && self.Helium_Pressure[i] + self.Nitrogen_Pressure[i] >= surface_inspired_n2_pressure) {
          decay_time_to_zero_gradient = 1 / (self.Nitrogen_Time_Constant[i] - self.Helium_Time_Constant[i]) * Math.log((surface_inspired_n2_pressure - self.Nitrogen_Pressure[i]) / self.Helium_Pressure[i]);
          integral_gradient_x_time = self.Helium_Pressure[i] / self.Helium_Time_Constant[i] * (1 - Math.exp(-self.Helium_Time_Constant[i] * decay_time_to_zero_gradient)) + (self.Nitrogen_Pressure[i] - surface_inspired_n2_pressure) / self.Nitrogen_Time_Constant[i] * (1 - Math.exp(-self.Nitrogen_Time_Constant[i] * decay_time_to_zero_gradient));
          self.Surface_Phase_Volume_Time[i] = integral_gradient_x_time / (self.Helium_Pressure[i] + self.Nitrogen_Pressure[i] - surface_inspired_n2_pressure);
        } else {
          self.Surface_Phase_Volume_Time[i] = 0;
        }
      }
    };
    DiveState.prototype.validate_data = function validate_data() {
      var self = this;
      '\n        Purpose: Check the the data loaded from the input file is valid\n\n        Side Effects: Sets\n        `self.Critical_Radius_He_Microns`\n        `self.Critical_Radius_N2_Microns`,\n        `self.Diver_Acclimatized`,\n        `self.units_fsw`,\n\n        or\n\n        Raises InputFileException, AltitudeException, ValueError\n\n        Returns: None\n        ';
      if (self.settings_values.Units.toLowerCase() === 'fsw') {
        self.units_fsw = true;
      } else if (self.settings_values.Units.toLowerCase() === 'msw') {
        self.units_fsw = false;
      } else {
        throw new ValueError('Bad Unit of measurement: Units = %s, must be \'fsw\' or \'msw\'' % self.settings_values.Units);
      }
      if (self.settings_values.Regeneration_Time_Constant <= 0) {
        throw new InputFileException('Regeneration_Time_Constant must be greater than 0');
      }
      if (self.units_fsw && self.altitude_values.Altitude_of_Dive > 30000) {
        throw new AltitudeException('ERROR! ALTITUDE OF DIVE HIGHER THAN MOUNT EVEREST');
      }
      if (!self.units_fsw && self.altitude_values.Altitude_of_Dive > 9144) {
        throw new AltitudeException('ERROR! ALTITUDE OF DIVE HIGHER THAN MOUNT EVEREST');
      }
      if (self.altitude_values.Diver_Acclimatized_at_Altitude.toLowerCase() === 'yes') {
        self.Diver_Acclimatized = true;
      } else if (self.altitude_values.Diver_Acclimatized_at_Altitude.toLowerCase() === 'no') {
        self.Diver_Acclimatized = false;
      } else {
        throw new AltitudeException('ERROR! DIVER ACCLIMATIZED AT ALTITUDE MUST BE YES OR NO');
      }
      self.Critical_Radius_N2_Microns = self.settings_values.Critical_Radius_N2_Microns;
      self.Critical_Radius_He_Microns = self.settings_values.Critical_Radius_He_Microns;
      if (self.settings_values.Critical_Radius_N2_Microns < 0.2 || self.settings_values.Critical_Radius_N2_Microns > 1.35) {
        throw new ValueError('Bad Critical Radius N2 Microns: Critical_Radius_N2_Microns = %f, must be between \'0.2\' and \'1.35\'' % self.settings_values.Critical_Radius_N2_Microns);
      }
      if (self.settings_values.Critical_Radius_He_Microns < 0.2 || self.settings_values.Critical_Radius_He_Microns > 1.35) {
        throw new ValueError('Bad Critical_Radius_He_Microns: Critical_Radius_He_Microns = %f, must be between \'0.2\' and \'1.35\'' % self.settings_values.Critical_Radius_He_Microns);
      }
    };
    DiveState.prototype.initialize_data = function initialize_data() {
      var self = this;
      var i;
      '\n        Purpose: Initialize the object with the data loaded from the input file\n\n        Side Effects: Sets\n\n        `self.Adjusted_Critical_Radius_He`,\n        `self.Adjusted_Critical_Radius_N2`,\n        `self.Altitude_Dive_Algorithm_Off`,\n        `self.Altitude_of_Dive`,\n        `self.Amb_Pressure_Onset_of_Imperm`,\n        `self.Barometric_Pressure`,\n        `self.Constant_Pressure_Other_Gases`,\n        `self.Crit_Volume_Parameter_Lambda`,\n        `self.Critical_Radius_He_Microns`,\n        `self.Critical_Radius_N2_Microns`,\n        `self.Critical_Volume_Algorithm_Off`,\n        `self.Gas_Tension_Onset_of_Imperm`,\n        `self.Gradient_Onset_of_Imperm_Atm`,\n        `self.Helium_Pressure`,\n        `self.Helium_Time_Constant`,\n        `self.Initial_Critical_Radius_He`,\n        `self.Initial_Critical_Radius_N2`,\n        `self.Max_Actual_Gradient`,\n        `self.Max_Crushing_Pressure_He`,\n        `self.Max_Crushing_Pressure_N2`,\n        `self.Minimum_Deco_Stop_Time`,\n        `self.Minimum_Deco_Stop_Time`,\n        `self.Nitrogen_Pressure`,\n        `self.Nitrogen_Time_Constant`,\n        `self.Pressure_Other_Gases_mmHg`,\n        `self.Regeneration_Time_Constant`,\n        `self.Run_Time`,\n        `self.Segment_Number`,\n        `self.Skin_Compression_GammaC`,\n        `self.Surface_Phase_Volume_Time`,\n        `self.Surface_Tension_Gamma`,\n        `self.Surface_Tension_Gamma`,\n        `self.Units_Factor`,\n        `self.Units_Word1`,\n        `self.Units_Word2`,\n        `self.Water_Vapor_Pressure`,\n\n        or\n\n        Raises AltitudeException, ValueError\n\n        Returns: None\n        ';
      self.Surface_Tension_Gamma = self.settings_values.Surface_Tension_Gamma;
      self.Skin_Compression_GammaC = self.settings_values.Skin_Compression_GammaC;
      self.Crit_Volume_Parameter_Lambda = self.settings_values.Crit_Volume_Parameter_Lambda;
      self.Gradient_Onset_of_Imperm_Atm = self.settings_values.Gradient_Onset_of_Imperm_Atm;
      self.Minimum_Deco_Stop_Time = self.settings_values.Minimum_Deco_Stop_Time;
      self.Critical_Radius_N2_Microns = self.settings_values.Critical_Radius_N2_Microns;
      self.Critical_Radius_He_Microns = self.settings_values.Critical_Radius_He_Microns;
      self.Regeneration_Time_Constant = self.settings_values.Regeneration_Time_Constant;
      self.Surface_Tension_Gamma = self.settings_values.Surface_Tension_Gamma;
      self.Minimum_Deco_Stop_Time = self.settings_values.Minimum_Deco_Stop_Time;
      if (self.units_fsw) {
        self.Units_Word1 = 'fswg';
        self.Units_Word2 = 'fsw/min';
        self.Units_Factor = 33;
        self.Water_Vapor_Pressure = 1.607;
      } else {
        self.Units_Word1 = 'mswg';
        self.Units_Word2 = 'msw/min';
        self.Units_Factor = 10.1325;
        self.Water_Vapor_Pressure = 0.493;
      }
      self.Constant_Pressure_Other_Gases = self.settings_values.Pressure_Other_Gases_mmHg / 760 * self.Units_Factor;
      self.Run_Time = 0;
      self.Segment_Number = 0;
      for (i = 0; i < ARRAY_LENGTH; i++) {
        self.Helium_Time_Constant[i] = Math.log(2) / self.Helium_Half_Time[i];
        self.Nitrogen_Time_Constant[i] = Math.log(2) / self.Nitrogen_Half_Time[i];
        self.Max_Crushing_Pressure_He[i] = 0;
        self.Max_Crushing_Pressure_N2[i] = 0;
        self.Max_Actual_Gradient[i] = 0;
        self.Surface_Phase_Volume_Time[i] = 0;
        self.Amb_Pressure_Onset_of_Imperm[i] = 0;
        self.Gas_Tension_Onset_of_Imperm[i] = 0;
        self.Initial_Critical_Radius_N2[i] = self.settings_values.Critical_Radius_N2_Microns * 0.000001;
        self.Initial_Critical_Radius_He[i] = self.settings_values.Critical_Radius_He_Microns * 0.000001;
      }
      if (self.settings_values.Critical_Volume_Algorithm.toLowerCase() === 'on') {
        self.Critical_Volume_Algorithm_Off = false;
      } else if (self.settings_values.Critical_Volume_Algorithm.toLowerCase() === 'off') {
        self.Critical_Volume_Algorithm_Off = true;
      } else {
        throw new ValueError('Bad Critical Volume Algorithm: Critical_Volume_Algorithm = %s, must be \'OFF or \'ON\'\'' % self.settings_values.Critical_Volume_Algorithm);
      }
      if (self.settings_values.Altitude_Dive_Algorithm.toLowerCase() === 'on') {
        self.Altitude_Dive_Algorithm_Off = false;
        if (self.altitude_values.Ascent_to_Altitude_Hours <= 0 && self.Diver_Acclimatized === false) {
          throw new AltitudeException('If diver is not acclimatized, Ascent_to_Altitude_Time must be greater than 0');
        }
      } else if (self.settings_values.Altitude_Dive_Algorithm.toLowerCase() === 'off') {
        self.Altitude_Dive_Algorithm_Off = true;
      } else {
        throw new ValueError('Bad Altitude Dive Algorithm: Altitude_Dive_Algorithm = %s, must be \'OFF or \'ON\'\'' % self.settings_values.Altitude_Dive_Algorithm);
      }
      if (self.Altitude_Dive_Algorithm_Off) {
        self.Altitude_of_Dive = 0;
        self.Barometric_Pressure = calc_barometric_pressure(self.Altitude_of_Dive, self.units_fsw);
        for (i = 0; i < ARRAY_LENGTH; i++) {
          self.Adjusted_Critical_Radius_N2[i] = self.Initial_Critical_Radius_N2[i];
          self.Adjusted_Critical_Radius_He[i] = self.Initial_Critical_Radius_He[i];
          self.Helium_Pressure[i] = 0;
          self.Nitrogen_Pressure[i] = (self.Barometric_Pressure - self.Water_Vapor_Pressure) * self.fraction_inert_gas;

        }
      } else {
        self.vpm_altitude_dive_algorithm(self.altitude_values);
      }
    };
    DiveState.prototype.set_gas_mixes = function set_gas_mixes(dive) {
      var self = this;
      var num_gas_mixes, fraction_oxygen, gasmix_summary, sum_of_fractions, i;
      '\n        Purpose: Checks the given gas mix fractions add up to 1.0, and adds them\n        to the object\n\n        Side Effects: Sets\n        `self.Fraction_Helium`,\n        `self.Fraction_Nitrogen`\n\n        or\n\n        Raises an InputFileException\n\n        Returns: None\n        ';
      num_gas_mixes = dive.num_gas_mixes;
      fraction_oxygen = new Array(num_gas_mixes);
      self.Fraction_Helium = new Array(num_gas_mixes);
      self.Fraction_Nitrogen = new Array(num_gas_mixes);
      for (i = 0; i < num_gas_mixes; i++) {
        gasmix_summary = dive.gasmix_summary;
        fraction_oxygen[i] = gasmix_summary[i].fraction_O2;
        self.Fraction_Nitrogen[i] = gasmix_summary[i].fraction_N2;
        self.Fraction_Helium[i] = gasmix_summary[i].fraction_He;
        sum_of_fractions = fraction_oxygen[i] + self.Fraction_Nitrogen[i] + self.Fraction_Helium[i];
        if (sum_of_fractions !== 1) {
          throw new InputFileException('ERROR IN INPUT FILE (gas mixes don\'t add up to 1.0');
        }
      }
      for (i = 0; i < num_gas_mixes; i++) {
        self.output_object.add_gasmix(fraction_oxygen[i], self.Fraction_Nitrogen[i], self.Fraction_Helium[i]);
      }
    };
    DiveState.prototype.profile_code_loop = function profile_code_loop(dive) {
      var self = this;
      var profile_code, word, profile;
      '\n        Purpose:\n        PROCESS DIVE AS A SERIES OF ASCENT/DESCENT AND CONSTANT DEPTH\n        SEGMENTS. THIS ALLOWS FOR MULTI-LEVEL DIVES AND UNUSUAL PROFILES. UPDATE\n        GAS LOADINGS FOR EACH SEGMENT.  IF IT IS A DESCENT SEGMENT, CALC CRUSHING\n        PRESSURE ON CRITICAL RADII IN EACH COMPARTMENT.\n        "Instantaneous" descents are not used in the VPM.  All ascent/descent\n        segments must have a realistic rate of ascent/descent.  Unlike Haldanian\n        models, the VPM is actually more conservative when the descent rate is\n        slower because the effective crushing pressure is reduced.  Also, a\n        realistic actual supersaturation gradient must be calculated during\n        ascents as this affects critical radii adjustments for repetitive dives.\n\n        Profile codes: 1 = Ascent/Descent, 2 = Constant Depth, 99 = Decompress\n\n        Side Effects: Sets\n        `self.Depth`,\n        `self.Ending_Depth`,\n        `self.Mix_Number`,\n        `self.Rate`,\n        `self.Run_Time_End_of_Segment`\n        `self.Starting_Depth`,\n\n        or\n\n        Raises an InputFileException\n\n        Returns: None\n        ';
      var ՐՏ_Iter1 = ՐՏ_Iterable(dive.profile_codes);
      for (var ՐՏ_Index1 = 0; ՐՏ_Index1 < ՐՏ_Iter1.length; ՐՏ_Index1++) {
        profile = ՐՏ_Iter1[ՐՏ_Index1];
        profile_code = profile.profile_code;
        if (profile_code === 1) {
          self.Starting_Depth = profile.starting_depth;
          self.Ending_Depth = profile.ending_depth;
          self.Rate = profile.rate;
          self.Mix_Number = profile.gasmix;
          self.gas_loadings_ascent_descent(self.Starting_Depth, self.Ending_Depth, self.Rate);
          if (self.Ending_Depth > self.Starting_Depth) {
            self.calc_crushing_pressure(self.Starting_Depth, self.Ending_Depth, self.Rate);
          }
          if (self.Ending_Depth > self.Starting_Depth) {
            word = 'Descent';
          } else if (self.Starting_Depth > self.Ending_Depth) {
            word = 'Ascent ';
          } else {
            word = 'ERROR';
          }
          self.output_object.add_dive_profile_entry_descent(self.Segment_Number, self.Segment_Time, self.Run_Time, self.Mix_Number, word, self.Starting_Depth, self.Ending_Depth, self.Rate);
        } else if (profile_code === 2) {
          self.Depth = profile.depth;
          self.Run_Time_End_of_Segment = profile.run_time_at_end_of_segment;
          self.Mix_Number = profile.gasmix;
          self.gas_loadings_constant_depth(self.Depth, self.Run_Time_End_of_Segment);
          self.output_object.add_dive_profile_entry_ascent(self.Segment_Number, self.Segment_Time, self.Run_Time, self.Mix_Number, self.Depth);
        } else if (profile_code === 99) {
          break;
        } else {
          throw new InputFileException('Invalid profile code %d. Valid profile codes are 1 (descent), 2 (constant), and 99 (ascent)' % profile_code);
        }
      }
    };
    DiveState.prototype.deco_stop_loop_block_within_critical_volume_loop = function deco_stop_loop_block_within_critical_volume_loop() {
      var self = this;
      var i;
      '\n        Purpose:\n        DECO STOP LOOP BLOCK WITHIN CRITICAL VOLUME LOOP\n        This loop computes a decompression schedule to the surface during each\n        iteration of the critical volume loop.  No output is written from this\n        loop, rather it computes a schedule from which the in-water portion of the\n        total phase volume time (Deco_Phase_Volume_Time) can be extracted.  Also,\n        the gas loadings computed at the end of this loop are used in the subroutine\n        which computes the out-of-water portion of the total phase volume time\n        (Surface_Phase_Volume_Time) for that schedule.\n\n        Note that exit is made from the loop after last ascent is made to a deco\n        stop depth that is less than or equal to zero.  A final deco stop less\n        than zero can happen when the user makes an odd step size change during\n        ascent - such as specifying a 5 msw step size change at the 3 msw stop!\n\n        Side Effects: Sets\n        `self.Deco_Stop_Depth`,\n        `self.Last_Run_Time`\n        `self.Next_Stop`,\n        `self.Starting_Depth`,\n\n        Returns: None\n        ';
      while (true) {
        self.gas_loadings_ascent_descent(self.Starting_Depth, self.Deco_Stop_Depth, self.Rate);
        if (self.Deco_Stop_Depth <= 0) {
          break;
        }
        if (self.Number_of_Changes > 1) {
          for (i = 1; i < self.Number_of_Changes; i++) {
            if (self.Depth_Change[i] >= self.Deco_Stop_Depth) {
              self.Mix_Number = self.Mix_Change[i];
              self.Rate = self.Rate_Change[i];
              self.Step_Size = self.Step_Size_Change[i];
            }
          }
        }
        self.boyles_law_compensation(self.First_Stop_Depth, self.Deco_Stop_Depth, self.Step_Size);
        self.decompression_stop(self.Deco_Stop_Depth, self.Step_Size);
        self.Starting_Depth = self.Deco_Stop_Depth;
        self.Next_Stop = self.Deco_Stop_Depth - self.Step_Size;
        self.Deco_Stop_Depth = self.Next_Stop;
        self.Last_Run_Time = self.Run_Time;
      }
    };
    DiveState.prototype.critical_volume_decision_tree = function critical_volume_decision_tree() {
      var self = this;
      var i;
      'Purpose:\n\n        Side Effects: Sets\n\n        `self.Deco_Stop_Depth`,\n        `self.Helium_Pressure`,\n        `self.Last_Run_Time`,\n        `self.Mix_Number`,\n        `self.Next_Stop`\n        `self.Nitrogen_Pressure`,\n        `self.Rate`,\n        `self.Run_Time`,\n        `self.Segment_Number`,\n        `self.Starting_Depth`,\n        `self.Step_Size`,\n        `self.Stop_Time`,\n\n        Returns: None\n        ';
      for (i = 0; i < ARRAY_LENGTH; i++) {
        self.Helium_Pressure[i] = self.He_Pressure_Start_of_Ascent[i];
        self.Nitrogen_Pressure[i] = self.N2_Pressure_Start_of_Ascent[i];
      }
      self.Run_Time = self.Run_Time_Start_of_Ascent;
      self.Segment_Number = self.Segment_Number_Start_of_Ascent;
      self.Starting_Depth = self.Depth_Change[0];
      self.Mix_Number = self.Mix_Change[0];
      self.Rate = self.Rate_Change[0];
      self.Step_Size = self.Step_Size_Change[0];
      self.Deco_Stop_Depth = self.First_Stop_Depth;
      self.Last_Run_Time = 0;
      while (true) {
        self.gas_loadings_ascent_descent(self.Starting_Depth, self.Deco_Stop_Depth, self.Rate);
        self.calc_max_actual_gradient(self.Deco_Stop_Depth);
        self.output_object.add_decompression_profile_ascent(self.Segment_Number, self.Segment_Time, self.Run_Time, self.Mix_Number, self.Deco_Stop_Depth, self.Rate);
        if (self.Deco_Stop_Depth <= 0) {
          break;
        }
        if (self.Number_of_Changes > 1) {
          for (i = 1; i < self.Number_of_Changes; i++) {
            if (self.Depth_Change[i] >= self.Deco_Stop_Depth) {
              self.Mix_Number = self.Mix_Change[i];
              self.Rate = self.Rate_Change[i];
              self.Step_Size = self.Step_Size_Change[i];
            }
          }
        }
        self.boyles_law_compensation(self.First_Stop_Depth, self.Deco_Stop_Depth, self.Step_Size);
        self.decompression_stop(self.Deco_Stop_Depth, self.Step_Size);
        if (self.Last_Run_Time === 0) {
          self.Stop_Time = Math.round(self.Segment_Time / self.Minimum_Deco_Stop_Time + 0.5) * self.Minimum_Deco_Stop_Time;
        } else {
          self.Stop_Time = self.Run_Time - self.Last_Run_Time;
        }
        self.output_object.add_decompression_profile_constant(self.Segment_Number, self.Segment_Time, self.Run_Time, self.Mix_Number, self.Deco_Stop_Depth, self.Stop_Time);
        self.Starting_Depth = self.Deco_Stop_Depth;
        self.Next_Stop = self.Deco_Stop_Depth - self.Step_Size;
        self.Deco_Stop_Depth = self.Next_Stop;
        self.Last_Run_Time = self.Run_Time;
      }
    };
    DiveState.prototype.critical_volume_loop = function critical_volume_loop() {
      var self = this;
      var rounding_operation2, i;
      '\n        Purpose:\n        If the Critical Volume\n        Algorithm is toggled "off" in the program settings, there will only be\n        one pass through this loop.  Otherwise, there will be two or more passes\n        through this loop until the deco schedule is "converged" - that is when a\n        comparison between the phase volume time of the present iteration and the\n        last iteration is less than or equal to one minute.  This implies that\n        the volume of released gas in the most recent iteration differs from the\n        "critical" volume limit by an acceptably small amount.  The critical\n        volume limit is set by the Critical Volume Parameter Lambda in the program\n        settings (default setting is 7500 fsw-min with adjustability range from\n        from 6500 to 8300 fsw-min according to Bruce Wienke).\n\n        Side Effects:\n\n        `self.Critical_Volume_Comparison`,\n        `self.Deco_Phase_Volume_Time`,\n        `self.Deco_Phase_Volume_Time`,\n        `self.Deco_Stop_Depth`,\n        `self.Ending_Depth`,\n        `self.First_Stop_Depth`,\n        `self.Helium_Pressure`,\n        `self.Helium_Pressure`,\n        `self.Last_Phase_Volume_Time`,\n        `self.Mix_Number`,\n        `self.Nitrogen_Pressure`\n        `self.Nitrogen_Pressure`,\n        `self.Phase_Volume_Time`,\n        `self.Rate`,\n        `self.Run_Time`,\n        `self.Run_Time`,\n        `self.Schedule_Converged`,\n        `self.Segment_Number`,\n        `self.Starting_Depth`,\n        `self.Starting_Depth`,\n        `self.Starting_Depth`,\n        `self.Step_Size`,\n\n        or\n\n        Raises a DecompressionStepException\n\n        Returns: None\n        ';
      while (true) {
        self.calc_ascent_ceiling();
        if (self.Ascent_Ceiling_Depth <= 0) {
          self.Deco_Stop_Depth = 0;
        } else {
          rounding_operation2 = self.Ascent_Ceiling_Depth / self.Step_Size + 0.5;
          self.Deco_Stop_Depth = Math.round(rounding_operation2) * self.Step_Size;
        }
        if (self.Deco_Stop_Depth > self.Depth_Start_of_Deco_Zone) {
          throw new DecompressionStepException('ERROR! STEP SIZE IS TOO LARGE TO DECOMPRESS');
        }
        self.projected_ascent(self.Depth_Start_of_Deco_Zone, self.Rate, self.Step_Size);
        if (self.Deco_Stop_Depth > self.Depth_Start_of_Deco_Zone) {
          throw new DecompressionStepException('ERROR! STEP SIZE IS TOO LARGE TO DECOMPRESS');
        }
        if (self.Deco_Stop_Depth === 0) {
          for (i = 0; i < ARRAY_LENGTH; i++) {
            self.Helium_Pressure[i] = self.He_Pressure_Start_of_Ascent[i];
            self.Nitrogen_Pressure[i] = self.N2_Pressure_Start_of_Ascent[i];
          }
          self.Run_Time = self.Run_Time_Start_of_Ascent;
          self.Segment_Number = self.Segment_Number_Start_of_Ascent;
          self.Starting_Depth = self.Depth_Change[0];
          self.Ending_Depth = 0;
          self.gas_loadings_ascent_descent(self.Starting_Depth, self.Ending_Depth, self.Rate);
          self.output_object.add_decompression_profile_ascent(self.Segment_Number, self.Segment_Time, self.Run_Time, self.Mix_Number, self.Deco_Stop_Depth, self.Rate);
          break;
        }
        self.Starting_Depth = self.Depth_Start_of_Deco_Zone;
        self.First_Stop_Depth = self.Deco_Stop_Depth;
        self.deco_stop_loop_block_within_critical_volume_loop();
        self.Deco_Phase_Volume_Time = self.Run_Time - self.Run_Time_Start_of_Deco_Zone;
        self.calc_surface_phase_volume_time();
        for (i = 0; i < ARRAY_LENGTH; i++) {
          self.Phase_Volume_Time[i] = self.Deco_Phase_Volume_Time + self.Surface_Phase_Volume_Time[i];
          self.Critical_Volume_Comparison = abs(self.Phase_Volume_Time[i] - self.Last_Phase_Volume_Time[i]);
          if (self.Critical_Volume_Comparison <= 1) {
            self.Schedule_Converged = true;
          }
        }
        if (self.Schedule_Converged || self.Critical_Volume_Algorithm_Off) {
          self.critical_volume_decision_tree();
        } else {
          self.critical_volume(self.Deco_Phase_Volume_Time);
          self.Deco_Phase_Volume_Time = 0;
          self.Run_Time = self.Run_Time_Start_of_Deco_Zone;
          self.Starting_Depth = self.Depth_Start_of_Deco_Zone;
          self.Mix_Number = self.Mix_Change[0];
          self.Rate = self.Rate_Change[0];
          self.Step_Size = self.Step_Size_Change[0];
          for (i = 0; i < ARRAY_LENGTH; i++) {
            self.Last_Phase_Volume_Time[i] = self.Phase_Volume_Time[i];
            self.Helium_Pressure[i] = self.He_Pressure_Start_of_Deco_Zone[i];
            self.Nitrogen_Pressure[i] = self.N2_Pressure_Start_of_Deco_Zone[i];
          }
          continue;
        }
        break;
      }
    };
    DiveState.prototype.decompression_loop = function decompression_loop(dive) {
      var self = this;
      var profile_code, ՐՏ_Unpack, i, ascents, profile, rounding_op;
      '\n        Purpose:\n        BEGIN PROCESS OF ASCENT AND DECOMPRESSION\n\n        Side Effects: Sets\n\n        `self.Deco_Phase_Volume_Time`,\n        `self.Deepest_Possible_Stop_Depth`,\n        `self.Depth_Change`,\n        `self.Depth_Change`,\n        `self.He_Pressure_Start_of_Ascent`,\n        `self.He_Pressure_Start_of_Deco_Zone`,\n        `self.Last_Phase_Volume_Time`,\n        `self.Last_Run_Time`,\n        `self.Max_Actual_Gradient`\n        `self.Mix_Change`,\n        `self.Mix_Change`,\n        `self.Mix_Number`,\n        `self.N2_Pressure_Start_of_Ascent`,\n        `self.N2_Pressure_Start_of_Deco_Zone`,\n        `self.Number_of_Changes`,\n        `self.Rate_Change`,\n        `self.Rate_Change`,\n        `self.Rate`,\n        `self.Run_Time_Start_of_Ascent`,\n        `self.Run_Time_Start_of_Deco_Zone`,\n        `self.Schedule_Converged`,\n        `self.Segment_Number_Start_of_Ascent`,\n        `self.Starting_Depth`,\n        `self.Step_Size_Change`,\n        `self.Step_Size_Change`,\n        `self.Step_Size`,\n\n        Returns: None\n        ';
      self.nuclear_regeneration(self.Run_Time);
      self.calc_initial_allowable_gradient();
      for (i = 0; i < ARRAY_LENGTH; i++) {
        self.He_Pressure_Start_of_Ascent[i] = self.Helium_Pressure[i];
        self.N2_Pressure_Start_of_Ascent[i] = self.Nitrogen_Pressure[i];
      }
      self.Run_Time_Start_of_Ascent = self.Run_Time;
      self.Segment_Number_Start_of_Ascent = self.Segment_Number;
      var ՐՏ_Iter2 = ՐՏ_Iterable(dive.profile_codes);
      for (var ՐՏ_Index2 = 0; ՐՏ_Index2 < ՐՏ_Iter2.length; ՐՏ_Index2++) {
        profile = ՐՏ_Iter2[ՐՏ_Index2];
        profile_code = profile.profile_code;
        if (profile_code === 99) {
          self.Number_of_Changes = profile.number_of_ascent_parameter_changes;
          self.Depth_Change = new Array(self.Number_of_Changes);
          self.Mix_Change = new Array(self.Number_of_Changes);
          self.Rate_Change = new Array(self.Number_of_Changes);
          self.Step_Size_Change = new Array(self.Number_of_Changes);
          var ՐՏ_Iter3 = ՐՏ_Iterable(enumerate(profile.ascent_summary));
          for (var ՐՏ_Index3 = 0; ՐՏ_Index3 < ՐՏ_Iter3.length; ՐՏ_Index3++) {
            ՐՏ_Unpack = ՐՏ_Iter3[ՐՏ_Index3];
            i = ՐՏ_Unpack[0];
            ascents = ՐՏ_Unpack[1];
            self.Depth_Change[i] = ascents.starting_depth;
            self.Mix_Change[i] = ascents.gasmix;
            self.Rate_Change[i] = ascents.rate;
            self.Step_Size_Change[i] = ascents.step_size;
          }
          self.Starting_Depth = self.Depth_Change[0];
          self.Mix_Number = self.Mix_Change[0];
          self.Rate = self.Rate_Change[0];
          self.Step_Size = self.Step_Size_Change[0];
        }
      }
      self.calc_start_of_deco_zone(self.Starting_Depth, self.Rate);
      if (self.units_fsw) {
        if (self.Step_Size < 10) {
          rounding_op = self.Depth_Start_of_Deco_Zone / self.Step_Size - 0.5;
          self.Deepest_Possible_Stop_Depth = Math.round(rounding_op) * self.Step_Size;
        } else {
          rounding_op = self.Depth_Start_of_Deco_Zone / 10 - 0.5;
          self.Deepest_Possible_Stop_Depth = Math.round(rounding_op) * 10;
        }
      } else {
        if (self.Step_Size < 3) {
          rounding_op = self.Depth_Start_of_Deco_Zone / self.Step_Size - 0.5;
          self.Deepest_Possible_Stop_Depth = Math.round(rounding_op) * self.Step_Size;
        } else {
          rounding_op = self.Depth_Start_of_Deco_Zone / 3 - 0.5;
          self.Deepest_Possible_Stop_Depth = Math.round(rounding_op) * 3;
        }
      }
      self.gas_loadings_ascent_descent(self.Starting_Depth, self.Depth_Start_of_Deco_Zone, self.Rate);

      self.Run_Time_Start_of_Deco_Zone = self.Run_Time;
      self.Deco_Phase_Volume_Time = 0;
      self.Last_Run_Time = 0;
      self.Schedule_Converged = false;
      for (i = 0; i < ARRAY_LENGTH; i++) {
        self.Last_Phase_Volume_Time[i] = 0;
        self.He_Pressure_Start_of_Deco_Zone[i] = self.Helium_Pressure[i];
        self.N2_Pressure_Start_of_Deco_Zone[i] = self.Nitrogen_Pressure[i];
        self.Max_Actual_Gradient[i] = 0;
      }
      self.critical_volume_loop();
    };
    DiveState.prototype.main = function main() {
      var self = this;
      var repetitive_dive_flag, i, dive;
      '\n        Purpose:\n        Main decompression loop. Checks that validates the input file, initializes the data\n        and loops over the dives.\n\n        Side Effects: Sets\n\n        `self.Max_Actual_Gradient`,\n        `self.Max_Crushing_Pressure_He`,\n        `self.Max_Crushing_Pressure_N2`,\n        `self.Run_Time`,\n        `self.Segment_Number`\n\n        or\n\n        Raises an InputFileException\n\n        Returns: None\n        ';
      self.validate_data();
      self.initialize_data();
      var ՐՏ_Iter4 = ՐՏ_Iterable(self.input_values);
      for (var ՐՏ_Index4 = 0; ՐՏ_Index4 < ՐՏ_Iter4.length; ՐՏ_Index4++) {
        dive = ՐՏ_Iter4[ՐՏ_Index4];
        self.output_object.new_dive(dive.desc);
        self.set_gas_mixes(dive);
        self.profile_code_loop(dive);
        self.decompression_loop(dive);
        repetitive_dive_flag = dive.repetitive_code;
        if (repetitive_dive_flag === 0) {
          continue;
        } else if (repetitive_dive_flag === 1) {
          self.Surface_Interval_Time = dive.surface_interval_time_minutes;
          self.gas_loadings_surface_interval(self.Surface_Interval_Time);
          self.vpm_repetitive_algorithm(self.Surface_Interval_Time);
          for (i = 0; i < ARRAY_LENGTH; i++) {
            self.Max_Crushing_Pressure_He[i] = 0;
            self.Max_Crushing_Pressure_N2[i] = 0;
            self.Max_Actual_Gradient[i] = 0;
          }
          self.Run_Time = 0;
          self.Segment_Number = 0;
          continue;
        } else {
          throw new InputFileException('Invalid repetitive dive flag %d. Must be 0 (don\'t repeat) or 1 (repeat)' % repetitive_dive_flag);
        }
      }
    };
    function HtmlOutput() {
      HtmlOutput.prototype.__init__.apply(this, arguments);
    }
    'Provides a convenient dumping ground for output. Can be exported to json and html\n    ';
    HtmlOutput.prototype.__init__ = function __init__(state_object) {
      var self = this;
      self.output = [];
      self.current_dive = -1;
      self.state_object = state_object;
    };
    HtmlOutput.prototype.new_dive = function new_dive(description) {
      var self = this;
      'Creates a new dive hash table and updates the current dive to\n        point at the newly created hash';
      self.output.push({
        'desc': description,
        'gasmix': [],
        'dive_profile': [],
        'decompression_profile': []
      });
      self.current_dive += 1;
    };
    HtmlOutput.prototype.add_gasmix = function add_gasmix(oxygen, nitrogen, helium) {
      var self = this;
      'Adds a new gasmix to the current dive';
      self.output[self.current_dive].gasmix.push({
        'oxygen': oxygen,
        'nitrogen': nitrogen,
        'helium': helium
      });
    };
    HtmlOutput.prototype.add_dive_profile_entry_ascent = function add_dive_profile_entry_ascent(segment_number, segment_time, run_time, mix_number, depth) {
      var self = this;
      var str;
      'Adds a new ascent entry to the dive profile table';
      self.output[self.current_dive].dive_profile.push({
          "segmentNumber": segment_number,
          "segmentTime": segment_time,
          "runTime": run_time,
          "mixNumber": mix_number,
          "depth": depth
      });
    };
    HtmlOutput.prototype.add_dive_profile_entry_descent = function add_dive_profile_entry_descent(segment_number, segment_time, run_time, mix_number, word, starting_depth, ending_depth, rate) {
      var self = this;
      var str;
      'Adds a new descent entry to the dive profile table';
      self.output[self.current_dive].dive_profile.push({
          "segmentNumber": segment_number,
          "segmentTime": segment_time,
          "runTime": run_time,
          "mixNumber": mix_number,
          "word": word,
          "startingDepth": starting_depth,
          "endingDepth": ending_depth,
          "rate": rate
      });
    };
    HtmlOutput.prototype.add_decompression_profile_ascent = function add_decompression_profile_ascent(segment_number, segment_time, run_time, mix_number, deco_stop_depth, rate) {
      var self = this;
      var str;
      'Adds a new ascent entry to the decompression table';
      self.output[self.current_dive].decompression_profile.push({
          "segmentNumber": segment_number,
          "segmentTime": segment_time,
          "runTime": run_time,
          "mixNumber": mix_number,
          "decoStopDepth": deco_stop_depth,
          "rate": rate
      });
    };
    HtmlOutput.prototype.add_decompression_profile_constant = function add_decompression_profile_constant(segment_number, segment_time, run_time, mix_number, deco_stop_depth, stop_time) {
      var self = this;
      var str;
      'Adds a new constant depth entry to the decompression table';
      self.output[self.current_dive].decompression_profile.push({
          "segmentNumber": segment_number,
          "segmentTime": segment_time,
          "runTime": run_time,
          "mixNumber": mix_number,
          "decoStopDepth": deco_stop_depth,
          "stopTime": stop_time,
      });
    };

    HtmlOutput.prototype.get_json = function get_json() {
      var self = this;
      'Return the output JSON';
      return self.output;
    };

    function schreiner_equation(initial_inspired_gas_pressure, rate_change_insp_gas_pressure, interval_time, gas_time_constant, initial_gas_pressure) {
      'Function for ascent and descent gas loading calculations';
      return initial_inspired_gas_pressure + rate_change_insp_gas_pressure * (interval_time - 1 / gas_time_constant) - (initial_inspired_gas_pressure - initial_gas_pressure - rate_change_insp_gas_pressure / gas_time_constant) * Math.exp(-gas_time_constant * interval_time);
    }
    function haldane_equation(initial_gas_pressure, inspired_gas_pressure, gas_time_constant, interval_time) {
      'Function for gas loading calculations at a constant depth';
      return initial_gas_pressure + (inspired_gas_pressure - initial_gas_pressure) * (1 - Math.exp(-gas_time_constant * interval_time));
    }
    function radius_root_finder(A, B, C, low_bound, high_bound) {
      var function_at_low_bound, function_at_high_bound, a, b, last_diff_change, differential_change, last_ending_radius, ending_radius, objective_functon, derivative_of_function, radius_at_low_bound, radius_at_high_bound, i;
      '\n    Purpose: This subroutine is a "fail-safe" routine that combines the\n    Bisection Method and the Newton-Raphson Method to find the desired root.\n    This hybrid algorithm takes a bisection step whenever Newton-Raphson would\n    take the solution out of bounds, or whenever Newton-Raphson is not\n    converging fast enough.  Source:  "Numerical Recipes in Fortran 77",\n    Cambridge University Press, 1992.\n\n    Side Effects: None\n\n    or\n\n    Raises a RootException, MaxIterationException\n\n    Returns: A floating point value\n    ';
      function_at_low_bound = low_bound * low_bound * (A * low_bound - B) - C;
      function_at_high_bound = high_bound * high_bound * (A * high_bound - B) - C;
      if (function_at_low_bound > 0 && function_at_high_bound > 0) {
        throw new RootException('ERROR! ROOT IS NOT WITHIN BRACKETS. Source:radius_root_finder. Values - highbound: ' + function_at_high_bound + " lowbound: " + function_at_low_bound);
      }
      if (function_at_low_bound < 0 && function_at_high_bound < 0) {
        throw new RootException('ERROR! ROOT IS NOT WITHIN BRACKETS. Source:radius_root_finder. Values - highbound: ' + function_at_high_bound + " lowbound: " + function_at_low_bound);
      }
      if (function_at_low_bound === 0) {
        return low_bound;
      } else if (function_at_high_bound === 0) {
        return high_bound;
      } else if (function_at_low_bound < 0) {
        radius_at_low_bound = low_bound;
        radius_at_high_bound = high_bound;
      } else {
        radius_at_high_bound = low_bound;
        radius_at_low_bound = high_bound;
      }
      ending_radius = 0.5 * (low_bound + high_bound);
      last_diff_change = abs(high_bound - low_bound);
      differential_change = last_diff_change;
      objective_functon = ending_radius * ending_radius * (A * ending_radius - B) - C;
      derivative_of_function = ending_radius * (ending_radius * 3 * A - 2 * B);
      for (i = 0; i < 100; i++) {
        a = ((ending_radius - radius_at_high_bound) * derivative_of_function - objective_functon) * ((ending_radius - radius_at_low_bound) * derivative_of_function - objective_functon) >= 0;
        b = abs(2 * objective_functon) > abs(last_diff_change * derivative_of_function);
        if (a || b) {
          last_diff_change = differential_change;
          differential_change = 0.5 * (radius_at_high_bound - radius_at_low_bound);
          ending_radius = radius_at_low_bound + differential_change;
          if (radius_at_low_bound === ending_radius) {
            return ending_radius;
          }
        } else {
          last_diff_change = differential_change;
          differential_change = objective_functon / derivative_of_function;
          last_ending_radius = ending_radius;
          ending_radius -= differential_change;
          if (last_ending_radius === ending_radius) {
            return ending_radius;
          }
        }
        if (abs(differential_change) < 1e-12) {
          return ending_radius;
        }
        objective_functon = ending_radius * ending_radius * (A * ending_radius - B) - C;
        derivative_of_function = ending_radius * (ending_radius * 3 * A - 2 * B);
        if (objective_functon < 0) {
          radius_at_low_bound = ending_radius;
        } else {
          radius_at_high_bound = ending_radius;
        }
      }
      throw new MaxIterationException('ERROR! ROOT SEARCH EXCEEDED MAXIMUM ITERATIONS');
    }
    function calc_barometric_pressure(altitude, units_fsw) {
      var radius_of_earth, acceleration_of_gravity, molecular_weight_of_air, gas_constant_r, temp_at_sea_level, pressure_at_sea_level_fsw, pressure_at_sea_level_msw, temp_gradient, gmr_factor, altitude_feet, altitude_meters, altitude_kilometers, pressure_at_sea_level, geopotential_altitude, temp_at_geopotential_altitude, barometric_pressure;
      '\n    Purpose: This function calculates barometric pressure at altitude based on the\n    publication "U.S. Standard Atmosphere, 1976", U.S. Government Printing\n    Office, Washington, D.C. The basis for this code is a Fortran 90 program\n    written by Ralph L. Carmichael (retired NASA researcher) and endorsed by\n    the National Geophysical Data Center of the National Oceanic and\n    Atmospheric Administration.  It is available for download free from\n    Public Domain Aeronautical Software at:  http://www.pdas.com/atmos.htm\n\n    Side Effects: None\n\n    Returns: A floating point value\n    ';
      radius_of_earth = 6369;
      acceleration_of_gravity = 9.80665;
      molecular_weight_of_air = 28.9644;
      gas_constant_r = 8.31432;
      temp_at_sea_level = 288.15;
      pressure_at_sea_level_fsw = 33;
      pressure_at_sea_level_msw = 10;
      temp_gradient = -6.5;
      gmr_factor = acceleration_of_gravity * molecular_weight_of_air / gas_constant_r;
      if (units_fsw) {
        altitude_feet = altitude;
        altitude_kilometers = altitude_feet / 3280.839895;
        pressure_at_sea_level = pressure_at_sea_level_fsw;
      } else {
        altitude_meters = altitude;
        altitude_kilometers = altitude_meters / 1000;
        pressure_at_sea_level = pressure_at_sea_level_msw;
      }
      geopotential_altitude = altitude_kilometers * radius_of_earth / (altitude_kilometers + radius_of_earth);
      temp_at_geopotential_altitude = temp_at_sea_level + temp_gradient * geopotential_altitude;
      barometric_pressure = pressure_at_sea_level * Math.exp(Math.log(temp_at_sea_level / temp_at_geopotential_altitude) * gmr_factor / temp_gradient);
      return barometric_pressure;
    }
    return new DiveState(input_json);
  };
  var algorithm = {};
  //kept for interface compatibility
  function plan(buhlmannTable, absPressure, isFreshWater, temperatureInCelcius) {
    this.isFreshWater = isFreshWater;
    this.bottomGasses = {};
    this.decoGasses = {};
    this.segments = [];
  }
  plan.prototype.addBottomGas = function (gasName, fO2, fHe) {
    this.bottomGasses[gasName] = dive.gas(fO2, fHe);
  };
  plan.prototype.addDecoGas = function (gasName, fO2, fHe) {
    this.decoGasses[gasName] = dive.gas(fO2, fHe);
  };
  plan.prototype.addFlat = function (depth, gasName, time) {
    return this.addDepthChange(depth, depth, gasName, time);
  };
  plan.prototype.addDepthChange = function (startDepth, endDepth, gasName, time) {
    var gas = this.bottomGasses[gasName] || this.decoGasses[gasName];
    //store this as a stage
    this.segments.push(dive.segment(startDepth, endDepth, gasName, time));
  };
  plan.prototype.calculateDecompression = function (maintainTissues, gfLow, gfHigh, maxppO2, maxEND, fromDepth) {
    maintainTissues = maintainTissues || false;
    gfLow = gfLow || 1;
    gfHigh = gfHigh || 1;
    maxppO2 = maxppO2 || 1.6;
    maxEND = maxEND || 30;
    var currentGasName;
    if (typeof fromDepth == 'undefined') {
      if (this.segments.length == 0) {
        throw 'No depth to decompress from has been specified, and neither have any dive stages been registered. Unable to decompress.';
      } else {
        fromDepth = this.segments[this.segments.length - 1].endDepth;
        currentGasName = this.segments[this.segments.length - 1].gasName;
      }
    } else {
      currentGasName = this.bestDecoGasName(fromDepth, maxppO2, maxEND);
      if (typeof currentGasName == 'undefined') {
        throw 'No deco gas found to decompress from provided depth ' + fromDepth;
      }
    }
    var label_to_gasmix = {};
    var gasmix_number = 1;
    //construct gas-mix summary
    var gasmix_summary = [];
    for (var gasName in this.bottomGasses) {
      var bottomGas = this.bottomGasses[gasName];
      //assign the bottomGas a gasmix number
      label_to_gasmix[gasName] = gasmix_number;
      gasmix_number++;
      gasmix_summary.push({
        'fraction_O2': bottomGas.fO2,
        'fraction_He': bottomGas.fHe,
        'fraction_N2': bottomGas.fN2
      });
    }
    for (var gasName in this.decoGasses) {
      var decoGas = this.decoGasses[gasName];
      //assign the bottomGas a gasmix number
      label_to_gasmix[gasName] = gasmix_number;
      gasmix_number++;
      gasmix_summary.push({
        'fraction_O2': decoGas.fO2,
        'fraction_He': decoGas.fHe,
        'fraction_N2': decoGas.fN2
      });
    }

      var getGasMixNumerForLabel = function(gasName) {
          var mix = label_to_gasmix[gasName];
          if (typeof mix == 'undefined') {
              throw "No gasMix number found for gasName: " + gasName + ". Known mixes: " + JSON.stringify(label_to_gasmix);
          }
          return mix;
      }

      var getLabelForGasMixNumber = function(mix) {
        for (var gasName in label_to_gasmix) {
            if (label_to_gasmix[gasName] == mix) {
                return gasName
            }
        }
        throw "No gasName found for mix: " + mix +". Known mixes: " + JSON.stringify(label_to_gasmix);
      }
    var profile_codes = [];
    var total_runtime = 0;
    //create dive profiles for each segment
    for (var index in this.segments) {
      var segment = this.segments[index];
      total_runtime = total_runtime + segment.time;
      if (segment.startDepth != segment.endDepth) {
        profile_codes.push({
          'profile_code': 1,
          'starting_depth': segment.startDepth,
          'ending_depth': segment.endDepth,
          'gasmix': getGasMixNumerForLabel(segment.gasName),
          'rate': (segment.endDepth - segment.startDepth) / segment.time
        });
      } else {
        profile_codes.push({
          'profile_code': 2,
          'depth': segment.endDepth,
          'gasmix': getGasMixNumerForLabel(segment.gasName),
          'run_time_at_end_of_segment': total_runtime
        });
      }
    }

    var ascent_summary = [];
    //add the initial jump
    ascent_summary.push({
      'starting_depth': fromDepth,
      'gasmix': getGasMixNumerForLabel(segment.gasName),
      'mod': 2000, //push this gas below ANY deco gasses for this segment
      'rate': -10,
      //meters
      'step_size': 3,
      //meters
      'setpoint': 0  //not on a CCR
    });
    //now add steps for each deco gas
    for (var gasName in this.decoGasses) {
      var decoGas = this.decoGasses[gasName];
      var mod = Math.round(decoGas.modInMeters(maxppO2, this.isFreshWater));
      var ead = Math.round(decoGas.eadInMeters(maxEND, this.isFreshWater));
      //pick gas switch depth as lesser of the two
      var switchDepth = mod < ead ? mod : ead;
      //if only switchDepth is less than fromDepth (else the algorithm will push you down)
      if (switchDepth > fromDepth) {
        switchDepth = fromDepth;
      }
      ascent_summary.push({
        'starting_depth': switchDepth,
        'gasmix':getGasMixNumerForLabel(gasName),
        'mod': mod,
        'rate': -10,
        //meters
        'step_size': 3,
        //meters
        'setpoint': 0  //Not on a CCR
      });
    }

    //sort in order of switch depths
    ascent_summary.sort(function(a, b) {
        if (a.starting_depth > b.starting_depth) {
            return -1;
        } else if (a.starting_depth < b.starting_depth) {
            return 1;
        } else {
            if (a.mod > b.mod) {
              return -1;
            } else if (a.mod < b.mod) {
              return 1;
            } else {
              return 0;
            }
        }
    });

    var duplicatesExist = true;
    while (duplicatesExist) {
      duplicatesExist = false;
      //remove duplicates
      for (var i = 0; i < ascent_summary.length - 1; i++) {
        var a1 = ascent_summary[i];
        var a2 = ascent_summary[i + 1];
        if (a1.starting_depth == a2.starting_depth) {
          //if they both have the same starting depth, remove the first one
          ascent_summary.splice(i, 1);
          duplicatesExist = true;
          break;
        }
      }
    }

    //create magical profilecode (for deco: 99)
    var deco_profile = {
      'profile_code': 99,
      'number_of_ascent_parameter_changes': ascent_summary.length,
      'ascent_summary': ascent_summary
    };
    profile_codes.push(deco_profile);
    var input = {
      'input': [{
          'desc': 'Dive!',
          'num_gas_mixes': gasmix_summary.length,
          'gasmix_summary': gasmix_summary,
          'profile_codes': profile_codes,
          'repetitive_code': 0
        }],
      'altitude': {
        'Altitude_of_Dive': 0,
        'Diver_Acclimatized_at_Altitude': 'yes',
        'Starting_Acclimatized_Altitude': 0,
        'Ascent_to_Altitude_Hours': 0,
        'Hours_at_Altitude_Before_Dive': 0
      },
      'settings': {
        'Units': 'msw',
        'SetPoint_Is_Bar': true,
        'Altitude_Dive_Algorithm': 'OFF',
        'Minimum_Deco_Stop_Time': 1,
        'Critical_Radius_N2_Microns': 0.55,
        'Critical_Radius_He_Microns': 0.45,
        'Critical_Volume_Algorithm': 'ON',
        'Crit_Volume_Parameter_Lambda': 6500,
        'Gradient_Onset_of_Imperm_Atm': 8.2,
        'Surface_Tension_Gamma': 0.0179,
        'Skin_Compression_GammaC': 0.257,
        'Regeneration_Time_Constant': 20160,
        'Pressure_Other_Gases_mmHg': 102
      }
    };

      //console.log(JSON.stringify(input, null, 2));
    var vpmPlanInner = VPMDivePlan(input);
    //execute divestate
    try {
      vpmPlanInner.main();
    } catch (e) {
      return e;
    }
    var outputjson = vpmPlanInner.output_object.get_json()[0];

    //wrangle output to conform to buhlmann-output - which is simply a series of
      //steps including descent and deco profiles all combined together.
      //and gasmix (the number), is instead referred to by the gas's registered name.
      var decoPlan = [];
      for (var index in outputjson.dive_profile) {
          var seg = outputjson.dive_profile[index];
          if (typeof seg.depth != 'undefined') {
              var newseg = dive.segment(seg.depth, seg.depth, getLabelForGasMixNumber(seg.mixNumber), seg.segmentTime)
            decoPlan.push(newseg);
          } else {
              var newseg = dive.segment(seg.startingDepth, seg.endingDepth, getLabelForGasMixNumber(seg.mixNumber), seg.segmentTime)
              decoPlan.push(newseg);
          }
      }


      for (var index in outputjson.decompression_profile) {
          var seg = outputjson.decompression_profile[index];
          if (typeof seg.rate != 'undefined') {
              var newseg = dive.segment(seg.decoStopDepth - (seg.segmentTime * seg.rate), seg.decoStopDepth, getLabelForGasMixNumber(seg.mixNumber), seg.segmentTime)
              decoPlan.push(newseg);
          } else {
              var newseg = dive.segment(seg.decoStopDepth, seg.decoStopDepth, getLabelForGasMixNumber(seg.mixNumber), seg.segmentTime)
              decoPlan.push(newseg);
          }
      }

      return decoPlan;
  };
  plan.prototype.bestDecoGasName = function (depth, maxppO2, maxEND) {
    //best gas is defined as: a ppO2 at depth <= maxppO2,
    // the highest ppO2 among all of these.
    // END <= 30 (equivalent narcotic depth < 30 meters)
    var winner;
    var winnerName;
    for (var gasName in this.decoGasses) {
      var candidateGas = this.decoGasses[gasName];
      var mod = Math.round(candidateGas.modInMeters(maxppO2, this.isFreshWater));
      var end = Math.round(candidateGas.endInMeters(depth, this.isFreshWater));
      if (depth <= mod && end <= maxEND) {
        if (typeof winner == 'undefined' || //either we have no winner yet
          winner.fO2 < candidateGas.fO2) {
          //or previous winner is a lower O2
          winner = candidateGas;
          winnerName = gasName;
        }
      }
    }
    return winnerName;
  };
  plan.prototype.ndl = function (depth, gasName, gf) {
    throw 'NDL for VPM-B is not yet implemented.';
  };
  algorithm.plan = plan;
  return algorithm;
};
}).call(this);
