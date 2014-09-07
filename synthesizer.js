// Processing Signal
var sampleRate = 44100;

function addSamples(data, sample1, sample2) {
    var data1 = generateAudioSample(sample1);
    var data2 = generateAudioSample(sample2);
    var n = Math.min(data1.length, data2.length);
    for (var i = 0; i < n; ++i) {
        data[i] = data1[i] + data2[i];
    }
}

function applyGain(data, gain) {
    var n = data.length;
    for (var i = 0; i < n; ++i) {
        data[i] *= gain;
    }
}

function applyClippedDistort(data) {
    var n = data.length;
    for (var i = 0; i < n; ++i) {
        data[i] = (Math.abs(data[i]) < 0.3) ? (data[i] * 2) : (data[i] / 2 + 0.4 * (data[i] > 0 ? 1 : -1));
    }
}

function applySinDistort(data, drive) {
    var n = data.length;
    var s = Math.PI * drive / 2;
    for (var i = 0; i < n; ++i) {
        data[i] = Math.sin(data[i] * s);
    }
}

function applyEnvelope(data, a, d, s, r) {
    var n = data.length;
    a *= n; d *= n; r *= n;
    var is = 1 - s;
    for (var i = 0; i < a; ++i) {
        data[i] *= i/a;
    }
    for (; i < (a + d); ++i) {
        data[i] *= (1 - (i-a)/d) * is + s;
    }
    for (; i < (n - r); ++i) {
        data[i] *= s;
    }
    for (var j = i; i < n; ++i) {
        data[i] *= s * (1 - (i - j) / r);
    }
}

function applyDecay(data, f) {
    var n = data.length;
    var s = f * 4;
    for (var i = 0; i < n; ++i) {
        data[i] *= Math.exp(-i/n * s);
    }
}

function applyResonantFilter(data, freq, rad_p, rad_z, scale) {
    var n = data.length;
    var theta = freq * 2 / sampleRate * Math.PI;
    var ap = Math.cos(theta) * rad_p, bp = Math.sin(theta) * rad_p;
    var az = Math.cos(theta) * rad_z, bz = Math.sin(theta) * rad_z;
    
    var a2 = 1, a1 = -2 * ap, a0 = rad_p;
    var b2 = 1, b1 = -2 * az, b0 = rad_z;
    
    var y1 = 0, y2 = 0, x1 = 0, x2 = 0;
    for (var i = 0; i < n; ++i) {
        var out = (b2 * data[i] + b1 * x1 + b0 * x2 - a1 * y1 - a0 * y2) / a2 * scale;
        x2 = x1;
        x1 = data[i];
        y2 = y1;
        y1 = out;
        data[i] = out;
    }
}

function getFreqSweep(data, length, freq1, freq2) {
    var d1 = Math.PI * 2 * freq1 / sampleRate,
        d2 = Math.PI * 2 * freq2 / sampleRate,
        dd = (d2 - d1) / length,
        dt = d1,
        t = 0;
    for (var i = 0; i < length; ++i) {
        data[i] = Math.sin(t);
        t += dt;
        dt += dd;
    }
}

function getNoise(data, length) {
    for (var i = 0; i < length; ++i) {
        data[i] = Math.random() * 2 - 1;
    }
}

// Processing Signal

Synth.loadSoundProfile({
    name: 'hatClosed',
    attack: function(sampleRate, frequency, volume) {
        // WIP: return the length of time, in seconds, the attack lasts
        return 0.0005;
    },
    dampen: function(sampleRate, frequency, volume) {
        // WIP: return a number representing the rate of signal decay.
        return 1;
    },
    wave: function(i, sampleRate, frequency, volume) {
        var data = [];
        getNoise(data, 2000);
        applyDecay(data, 1);
        applyResonantFilter(data, 0.05, 0.94, 0.9, 0.5);
        applyGain(data, 0.75);
        
        var length = data.length;
        return data[i % length];
    }
});

var samples = {
    bassDrum: [
        [ addSamples,
          [
              [ getFreqSweep, 5000, 80, 20 ],
              [ applyClippedDistort ],
              [ applyEnvelope, 0.1, 0.4, 0.2, 0.2 ],
              [ applySinDistort, 1 ],
              [ applyGain, 0.5 ],
          ],
          [
              [ getFreqSweep, 5000, 78, 30 ],
              [ applyEnvelope, 0.05, 0.4, 0.2, 0.2 ],
              [ applySinDistort, 2 ],
              [ applyGain, 0.5 ],
          ],
        ]
    ],
    hatClosed: [
        [ getNoise, 2000 ],
        [ applyDecay, 1 ],
        [ applyResonantFilter, 0.05, 0.94, 0.9, .5 ],
        [ applyGain, 0.75 ],
    ],
    hatOpen: [
        [ getNoise, 10000 ],
        [ applyResonantFilter, 0.7, 0.8, 0.5, .75 ],
        [ applyResonantFilter, 0.7, 0.8, 0.5, .8 ],
        [ applyResonantFilter, 0.8, 0.8, 0.5, .8 ],
        [ applyDecay, 0.8 ],
    ],
};

function generateAudioSample(sample) {
    var data = [];
    for (var j = 0; j < sample.length; ++j) {
        var func = sample[j].shift();
        var args = sample[j];
        args.unshift(data);
        func.apply(this, args);
    }
    return data;
}

function generateAudioSamples() {
    for (i in samples) {
        var data = generateAudioSample(samples[i]);

        (function(i, data) {
            Synth.loadSoundProfile({
                name: i,
                attack: function(sampleRate, frequency, volume) {
                    // WIP: return the length of time, in seconds, the attack lasts
                    return 0.0005;
                },
                dampen: function(sampleRate, frequency, volume) {
                    // WIP: return a number representing the rate of signal decay.
                    return 1;
                },
                wave: function(i, sampleRate, frequency, volume) {
                    var length = data.length;
                    return data[i % length];
                }
            });
        })(i, data);
    }
}

generateAudioSamples();
var instruments = {};
var instrumentDurations = {};

$(function() {
    Synth.setSampleRate(sampleRate);

    instruments.piano = Synth.createInstrument('piano');
    instrumentDurations.piano = 2;

    instruments.edm = Synth.createInstrument('edm');
    instrumentDurations.edm = 0.2;

    instruments.bassDrum = Synth.createInstrument('bassDrum');
    instrumentDurations.bassDrum = 0.1;

    instruments.hatOpen = Synth.createInstrument('hatOpen');
    instrumentDurations.hatOpen = 0.1;

    instruments.hatClosed = Synth.createInstrument('hatClosed');
    instrumentDurations.hatClosed = 0.05;

    //var edmLoop = loop('edm', edmNotes);
    var bassDrumLoop = loop('piano', notes);
});

var bpm = 240;

function loop(instrumentName, notes) {
    var beatIndex = 0;
    var loopHandle = {
        name: instrumentName,
        shouldContinue: true
    }

    var closure = function() {
        var beatNote = boolArrayToNoteArray(notes[beatIndex]);
        playNotes(instrumentName, beatNote);

        myRectangle.x = myRectangle.x + 20;
        if (myRectangle.x > 800) {
            myRectangle.x = myRectangle.x % 800;
        }

        // clear
        context.clearRect(0, 0, canvas.width, canvas.height);

        draw(myRectangle, context);

        beatIndex = (beatIndex + 1) % notes.length;
        if (loopHandle.shouldContinue) {
            setTimeout(function() {
                closure();
            }, 60 / bpm * 1000);
        }
    }
    closure();
    return loopHandle;
}

function playNotes(instrumentName, notes) {
    //console.log('Plyaing notes for ' + instrumentName + ' with notes : ' + JSON.stringify(notes));
    var instrument = instruments[instrumentName];
    var duration = instrumentDurations[instrumentName];
    var len = notes.length;
    for (var i = 0; i < len; i++) {
        console.log('i = ' +  i);
        var note = notes[i];
        note.push(duration);
        if (i == 0) {
            instrument = instruments['bassDrum'];
        }
        var func = instrument.play;
        func.apply(instrument, note);
    }
    
}

var noteOffset = 29;
var noteLetters = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',];

function boolArrayToNoteArray(arr) {
    var result = [];
    var len = arr.length;
    for (var i = 0; i < len; i++) {
        if (arr[i] === true) {
            var inverseOffset = noteOffset - i;
            var octave = inverseOffset / noteLetters.length + 1;
            var noteNum = inverseOffset % noteLetters.length;
            var noteLetter = noteLetters[noteNum];
            result.push([noteLetter, octave]);
        }
    }
    return result;
}
