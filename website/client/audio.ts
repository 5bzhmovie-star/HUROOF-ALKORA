let context: AudioContext | null = null;
export function unlockAudio() { try {
    context ??= new AudioContext();
    void context.resume();
}
catch { } }
export function playSound(kind: 'buzz' | 'win') { if (typeof window === 'undefined' || localStorage.getItem('hk-sound') !== 'on')
    return; try {
    unlockAudio();
    if (!context)
        return;
    const notes = kind === 'buzz' ? [660, 880] : [523, 659, 784, 1046];
    notes.forEach((frequency, i) => { const oscillator = context!.createOscillator(), gain = context!.createGain(), start = context!.currentTime + i * .12; oscillator.type = 'sine'; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(.1, start + .015); gain.gain.exponentialRampToValueAtTime(.0001, start + .25); oscillator.connect(gain); gain.connect(context!.destination); oscillator.start(start); oscillator.stop(start + .27); });
}
catch { } }
