import * as Tone from 'tone';

export class BetterPolySynth {
	private synths: Tone.Synth[];
	private usedSynths: boolean[];
	constructor(synths = 100) {
		this.synths = [];
		this.usedSynths = [];
		for (let i = 0; i < synths; i++) {
			this.synths.push(new Tone.Synth().toDestination());
			this.usedSynths.push(false);
		}
	}
	triggerAttackRelease(freq: number, duration: number, delay: number) {
		for (let i = 0; i < this.synths.length; i++) {
			if (!this.usedSynths[i]) {
				this.usedSynths[i] = true;
				this.synths[i].triggerAttackRelease(freq, duration, delay);
				setTimeout(
					() => {
						console.log(i);
						this.usedSynths[i] = false;
					},
					delay + duration + 100
				);
				return;
			}
		}
		console.warn(`all ${this.synths.length} synths are already in use, skipping note`);
	}
	shutup() {
		this.synths.forEach((synth) => synth.triggerRelease());
	}
}
