import { cleanHtml } from "src/html-cleaner";
import {
	addIcon,
	App,
	debounce,
	Editor,
	MarkdownRenderer,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	setIcon,
	TFile,
	normalizePath,
} from "obsidian";
import { Markdown2HtmlSettings, Markdown2HtmlSettingsTab as Markdown2HtmlSettingsTab } from "./settings";
import { FileSystemAdapter } from 'obsidian';

export default class Markdown2Html extends Plugin {
	private copyInProgressModal: Modal;
	private copyResult: HTMLElement | undefined;

	async onload() {
		// add custom icon
		addIcon(
			"markdown2html-icon",
			`<g transform="scale(4.1666)" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
			<path d="m15 17.5 2.5-2 2.5 2" />
			<path d="m15 3-3 3 3 3" />
			<path d="M17.5 21.5v-6" />
			<path d="m18.5 3 3 3-3 3" />
			<path d="M2 12.5h20" />
			<path d="M4.11 21.5v-6l3.74 3 3.65-3v6" />
			<path d="M4.5 9.5v-7H8" />
			<path d="M8 5.5H4.5" />
			</g>`
		);

		//Add a menu entry in the pop up file menu and get the selected file or files of the selected directory and subdirectories 
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				menu.addItem((item) => {
					item
						.setTitle('Foundry batch export')
						.setIcon('markdown2html-icon')
						.onClick(() => {
					console.log("Registered a file menue selection")
					console.log("Filepath",file.path)
					const folder = file.path;
						//getMarkdownFiles returns an array of objects of ALL markdown files in the obsidian vault
						const files = this.app.vault.getMarkdownFiles().filter(file =>file.path.startsWith(folder + "/"));
						for (let i = 0; i < files.length; i++) {
						console.log(files[i].path);
						console.log(files[i].basename);
						console.log(files[i].name);
						console.log(files[i].extension);
						}
					});
				});
			})
			);

		// init settings
		const settingsTab = new Markdown2HtmlSettingsTab(this.app, this);
		this.addSettingTab(settingsTab);

		// init modal
		this.copyInProgressModal = new Modal(this.app); // create modal as object and storing it in the property/class --> this modal holds the content of the current app/note??
		this.copyInProgressModal.titleEl.setText("Creating HTML from Markdown"); // extend the modal and set the title
		const rotateDiv = createDiv({ parent: this.copyInProgressModal.contentEl, cls: "md2html-rotate" }); // create a div with the modal content
		setIcon(rotateDiv, "loader");

		// This will be called when the modal is closed because it is next in line
		// and the modal is not closed yet. So it tirggers the next function after the
		// modal is closed.

		const copyCallback = () => {
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (view != null) {
				if (view.editor != null) {
					this.startCopyProcess();
					console.log("View editor found");
					this.renderHtml(view.editor);
				} else {
					console.log("View editor not found");
					this.copyResult = view.contentEl;
					if (this.hasCopyResult()) {
						this.startCopyProcess();
						this.copyHtmlToClipboard(settingsTab.settings);
					}
				}
			}
		};

		// add copy command
		this.addCommand({
			id: "clipboard",
			icon: "markdown2html-icon",
			name: "Copy editor selection or full note as HTML",
			callback: copyCallback,
		});

		// add ribon icon
		this.addRibbonIcon("markdown2html-icon", "Copy editor selection or full note as HTML", () => copyCallback());

		// register post processor to monitor markdown render progress
		this.registerMarkdownPostProcessor(async (el, ctx) => {
			// INFO:
			// We can't unregister the post processor, and all postprocessors are called every time a render is triggered.
			// To test if the render was triggered by our copy process, we check if our copy process is in progress.
			if (this.hasCopyResult()) {
				// Get's called after every segment (can be multiple for renders with plugins like dataview).
				// Since it has a debaounce delay that will reset after every call,
				// this function will execute effectively only once after all rendering actions are fully done
				this.copyHtmlToClipboard(settingsTab.settings);
			}
		}, Number.MAX_SAFE_INTEGER);
	}

	
	/** Openes a modal to let the user know that the copy is in progress and triggers the render of the markdown document or selection. */
	private renderHtml = async (editor: Editor,settings?: Markdown2HtmlSettings,fileListToRender?: string[]) => {
		//check if settings have file list in that case branche into the batch rendering?
		const path = this.app.workspace.activeEditor?.file?.path ?? "";
		const content = () => {
			if (editor.somethingSelected()) {
				return editor.getSelection();
			} else {
				return editor.getValue();
			}
		};
//I never get this as a debug message??? AHA THIS IS a DEBUG Message and not a LOG!
		console.debug("Markdown2Html: Copying to clipboard", path);
		// The result of the render is stored in copyResult by appending the rendered html elements one by one
		// so the render result is stored on the property and not as a return  value also according to line 103ff the render process is called several times?
		console.log("There was a render call");
		await MarkdownRenderer.render(this.app, content(), this.copyResult as HTMLElement, path, this);
	};

	/** Cleans up the rendered HTML and stores it in the system clipboard. */
	private copyHtmlToClipboard = debounce(
		async (settings: Markdown2HtmlSettings) => {
			console.log("exportClipboard", settings.exportClipboard);
			let html="";
			if (settings.exportClipboard) {
				//if(settings.exportDirty) {
					// if the user wants to export the dirty HTML, we just copy the result
					//!TODO move this to cleanhtml function
				//navigator.clipboard
				//	.writeText(this.copyResult?.innerHTML ?? "")
				//	.then(() => new Notice("Dirty HTML copied to the clipboard", 3500))
				//	.catch(() => new Notice("Couldn't copy html to the clipboard", 3500))
				//	.finally(() => this.endCopyProcess())
				//} else {
					// if the user wants to export the clean HTML, we need to wait for the render to finish
					this.copyInProgressModal.close();
					html = await cleanHtml(this.copyResult as HTMLElement, settings);
					navigator.clipboard
						.writeText(html)
						.then(() => new Notice("Cleaned HTML copied to the clipboard", 3500))
						.catch(() => new Notice("Couldn't copy html to the clipboard", 3500))
						.finally(() => this.endCopyProcess());
				//}
			}
			// add another if statement that checks for html file export, if true export html variable to file
			if (settings.htmlExportFilePath !==""){

				console.log("File Path export code needs to be implemented", settings.htmlExportFilePath);
				//save html to file
				
				let vaultPath="";
				
				const adapter = this.app.vault.adapter;
				if (adapter instanceof FileSystemAdapter) {
				  vaultPath = adapter.getBasePath();
				  console.log("Vault absolute path:", vaultPath);
				}
				
					// Content to save
					const content = html;
				
					// File path within the vault
					const filePath = normalizePath("my-note.html");
				
					// Check if file exists
					const existingFile = this.app.vault.getAbstractFileByPath(filePath);
				
					if (existingFile instanceof TFile) {
					  // If file exists, modify it
					  await this.app.vault.modify(existingFile, content);
					} else {
					  // If file doesn't exist, create it
					  await this.app.vault.create(filePath, content);
					}
				
					console.log(`Content saved to ${filePath}`);
				
				
				
				//end of code
			}
		},
		500, /* wait delay until copy to clipboard happens */
		true /* reset delay if method is called before timer finishes */
	);

	private startCopyProcess() {
		this.copyResult = createDiv();
		this.copyInProgressModal.open();
	}

	private endCopyProcess() {
		this.copyResult = undefined;
		this.copyInProgressModal.close();
	}

	private hasCopyResult() {
		return this.copyResult !== undefined;
	}

	onunload() {}
}
