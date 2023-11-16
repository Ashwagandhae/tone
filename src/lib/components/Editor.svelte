<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import * as Tone from 'tone';

	import { fabric } from 'fabric';
	import type { BetterPolySynth } from '$lib/synth';

	export let synth: BetterPolySynth;

	let canvasElement: HTMLCanvasElement;

	// function playTone() {
	// 	synth.triggerAttackRelease(freq, 0.5);
	// 	synth.triggerAttackRelease(freq * (2 / 3), 0.5);
	// 	synth.triggerAttackRelease(freq * (3 / 5), 0.5);
	// }

	const NOTE_WIDTH = 20;

	let canvas: fabric.Canvas;

	let currentObjectMoving = false;
	let mouseMoving = false;

	function setControls(obj: fabric.Object) {
		obj.set({
			lockScalingY: true,
			lockRotation: true,
			hasRotatingPoint: false
		});
		obj.setControlsVisibility({
			mt: false,
			mb: false,
			tl: false,
			tr: false,
			bl: false,
			br: false,
			mtr: false
		});
	}

	function createNote(x: number, y: number) {
		const note = new fabric.Rect({
			fill: 'green',
			left: x - NOTE_WIDTH / 2,
			top: y - NOTE_WIDTH / 2,
			width: NOTE_WIDTH,
			height: NOTE_WIDTH
		});
		setControls(note);
		canvas.add(note);
		playEditNote(note);
	}
	onMount(() => {
		canvas = new fabric.Canvas(canvasElement);
		canvas.on('mouse:down', (e) => {
			mouseMoving = false;
		});
		canvas.on('mouse:move', (e) => {
			// check if mouse actually moved
			if (e.e.movementX != 0 || e.e.movementY != 0) {
				mouseMoving = true;
			}
		});
		canvas.on('mouse:up', (e) => {
			if (e.target) {
				playEditNote(e.target);
			} else {
				if (!mouseMoving) {
					const pointer = canvas.getPointer(e.e);
					const x = pointer.x;
					const y = pointer.y;
					createNote(x, y);
				}
			}
		});

		canvas.on('object:moving', (e) => {
			if (e.target) {
				currentObjectMoving = true;
			}
		});

		canvas.on('selection:created', (e) => {
			let select = canvas.getActiveObject() as fabric.ActiveSelection;
			setControls(select);
			playEditNote(select);
		});
	});

	let copyData: { objects: fabric.Object[]; rect: { x: number; y: number } } = {
		objects: [],
		rect: { y: 0, x: 0 }
	};
	function copy() {
		copyData.objects = new Array();
		let activeObject = canvas.getActiveObject();
		if (activeObject) {
			copyData.rect = getAbsolutePosition(activeObject);
			canvas.getActiveObjects().forEach(function (o) {
				var object = fabric.util.object.clone(o);
				copyData.objects.push(object);
			});
		}
	}

	function paste() {
		if (copyData.objects.length > 0) {
			for (let obj of copyData.objects) {
				if (copyData.objects.length == 1) {
					obj.set('top', obj.top!);
					obj.set('left', obj.left! + 20);
				} else {
					obj.set('top', obj.top! + copyData.rect.y);
					obj.set('left', obj.left! + copyData.rect.x + 20);
				}

				canvas.add(obj);
			}
			canvas.discardActiveObject();
			var sel = new fabric.ActiveSelection(copyData.objects, {
				canvas: canvas
			});
			canvas.setActiveObject(sel);
		}
		canvas.renderAll();
	}

	function posToTime(pos: number) {
		return pos / 100 / speed;
	}

	function timeToPos(time: number) {
		return time * speed * 100;
	}

	const MIN_N = 21;
	const MAX_N = 108;
	const CANVAS_HEIGHT = 1000;
	const CANVAS_WIDTH = 5000;
	function getAbsolutePosition(obj: fabric.Rect) {
		var m = obj.calcTransformMatrix();

		return { x: m[4], y: m[5] };
	}
	function playNote(note: fabric.Rect, delay: boolean, offsetTime?: number) {
		let pos = getAbsolutePosition(note);
		let rect = note.getBoundingRect();
		let left = pos.x - rect.width / 2;
		const middleY = pos.y + rect.height / 2;
		// https://newt.phys.unsw.edu.au/jw/notes.html
		const midi = MIN_N + (1 - middleY / CANVAS_HEIGHT) * (MAX_N - MIN_N);
		const freq = 440 * Math.pow(2, (midi - 69) / 12);
		// time based on width
		const time = posToTime(rect.width);
		// delay based on x position
		const delayTime = delay ? posToTime(left) - (offsetTime ?? 0) : 0;
		synth.triggerAttackRelease(freq, time, Tone.now() + delayTime);
	}

	function playEditNote(obj: fabric.ActiveSelection | fabric.Object) {
		synth.shutup();
		// check if note is a selection
		if (obj.type == 'activeSelection') {
			let offsetTime = posToTime(obj.getBoundingRect().left);
			(obj as fabric.ActiveSelection).getObjects().forEach((note) => {
				playNote(note, true, offsetTime);
			});
		} else {
			playNote(obj as fabric.Rect, false);
		}
	}

	function reset() {
		canvas.clear();
	}

	type PlayState =
		| {
				tag: 'playing';
				playTime: number;
				interval: number;
		  }
		| {
				tag: 'stopped';
		  };

	let playState: PlayState = { tag: 'stopped' };

	function stopPlay() {
		synth.shutup();
		if (playState.tag == 'playing') {
			clearInterval(playState.interval);
			playState = { tag: 'stopped' };
		}
	}

	function getLastSoundTime() {
		let maxTime = 0;
		canvas.getObjects().forEach((obj) => {
			const time = posToTime(obj.getBoundingRect().left);
			const duration = posToTime(obj.getBoundingRect().width);
			maxTime = Math.max(maxTime, time + duration);
		});
		return maxTime;
	}

	const TIME_BAR_REFRESH = 20;
	function play() {
		stopPlay();
		canvas.getObjects().forEach((obj) => {
			playNote(obj as fabric.Rect, true);
		});
		let lastSoundTime = getLastSoundTime();
		playState = {
			tag: 'playing',
			playTime: 0,
			interval: setInterval(() => {
				if (playState.tag == 'stopped') {
					return;
				}
				playState.playTime += TIME_BAR_REFRESH / 1000;
				if (playState.playTime > Math.min(lastSoundTime, posToTime(CANVAS_WIDTH))) {
					stopPlay();
				}
			}, TIME_BAR_REFRESH)
		};
	}

	function remove() {
		let selection = canvas.getActiveObjects();
		if (selection) {
			canvas.discardActiveObject();
			selection.forEach((obj) => {
				canvas.remove(obj);
			});
		}
	}

	onDestroy(() => {
		canvas.dispose();
	});

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key == 'Backspace') {
			remove();
		}
		if (e.key == ' ') {
			if (playState.tag == 'playing') {
				stopPlay();
			} else {
				play();
			}
		}
		if (e.key == 'c' && (e.ctrlKey || e.metaKey)) {
			copy();
		}
		if (e.key == 'v' && (e.ctrlKey || e.metaKey)) {
			paste();
		}
	}
	let freq: number = 440;

	function createNoteAtFreq() {
		const midi = 69 + 12 * Math.log2(freq / 440);
		const middleY = ((MAX_N - midi) / (MAX_N - MIN_N)) * CANVAS_HEIGHT;
		createNote(10, middleY);
	}

	let midi: number = 69;

	function createNoteAtMidi() {
		const middleY = ((MAX_N - midi) / (MAX_N - MIN_N)) * CANVAS_HEIGHT;
		createNote(10, middleY);
	}

	let speed: number = 1;
</script>

<svelte:window on:keydown={handleKeyDown} />
<div class="top">
	<div class="controls">
		{#if playState.tag == 'playing'}
			<button on:click={stopPlay}>stop</button>
		{:else}
			<button on:click={play}>play</button>
		{/if}
		<input type="number" bind:value={freq} />
		<button on:click={createNoteAtFreq}>create note at frequency</button>
		<input type="number" bind:value={midi} />
		<button on:click={createNoteAtMidi}>create note at midi</button>
		<label for="speed">speed {speed}</label>
		<input type="range" id="speed" bind:value={speed} min="0.2" max="5" step="0.01" />
		<button on:click={copy}>copy</button>
		<button on:click={paste}>paste</button>
		<button on:click={remove}>delete</button>
		<button on:click={reset}>reset</button>
	</div>

	<div class="contain">
		{#if playState.tag == 'playing'}
			<div
				class="timeBar"
				style={`transform: translateX(${timeToPos(playState.playTime)}px)`}
			></div>
		{/if}
		<canvas bind:this={canvasElement} width={CANVAS_WIDTH} height={CANVAS_HEIGHT}></canvas>
	</div>
</div>

<style>
	canvas {
		border: 1px solid black;
	}
	.top {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
	}
	.contain {
		width: 100%;
		height: 100%;
		overflow: scroll;
		position: relative;
	}
	.controls {
		display: flex;
		flex-direction: row;
		gap: 1rem;
	}
	.timeBar {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		width: 2px;
		background: hsl(0, 0%, 90%, 0.2);
	}
	input[type='number'] {
		width: 5rem;
	}
</style>
