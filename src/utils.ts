/* @ts-ignore */
const dialog: Electron.Dialog =require('electron'.remote.dialog); // for file picker
// see obsidian-webpage-export

export function removeEmptyLines(text: string): string {
	return text.replace(/^\s*/gm, "");
}

export function isEmpty(text: string): boolean {
	return removeEmptyLines(text).length === 0;
}
