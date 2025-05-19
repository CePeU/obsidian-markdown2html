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
} from "obsidian";
import { Markdown2HtmlSettings, Markdown2HtmlSettingsTab as Markdown2HtmlSettingsTab } from "./settings";

export default class Markdown2Html extends Plugin {
	private copyInProgressModal: Modal;
	private copyResult: HTMLElement | undefined;

	async onload() {
		// add custom icon
		addIcon(
			"markdown2html-icon",
			`<g transform="scale(4.1666)" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
			<path d="M10 22v-6h3.5" />
			<path d="M13.5 19H10" />
			<path d="m15 6 2.5 2V2" />
			<path d="m17 16 3 3-3 3" />
			<path d="M17.5 8 20 6" />
			<path d="M2 12h20" />
			<path d="M4.11 8V2l3.74 3 3.65-3v6" />
			<path d="m6 16-3 3 3 3" />
			</g>`
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
	private renderHtml = async (editor: Editor) => {
		const path = this.app.workspace.activeEditor?.file?.path ?? "";
		const content = () => {
			if (editor.somethingSelected()) {
				return editor.getSelection();
			} else {
				return editor.getValue();
			}
		};

		console.debug("Markdown2Html: Copying to clipboard", path);
		await MarkdownRenderer.render(this.app, content(), this.copyResult as HTMLElement, path, this);
	};

	/** Cleans up the rendered HTML and stores it in the system clipboard. */
	private copyHtmlToClipboard = debounce(
		async (settings: Markdown2HtmlSettings) => {
			console.log("exportClipboard", settings.exportClipboard);
			if (settings.exportClipboard) {
				if(settings.exportDirty) {
					// if the user wants to export the dirty HTML, we just copy the result
				navigator.clipboard
					.writeText(this.copyResult?.innerHTML ?? "")
					.then(() => new Notice("Dirty HTML copied to the clipboard", 3500))
					.catch(() => new Notice("Couldn't copy html to the clipboard", 3500))
					.finally(() => this.endCopyProcess())
				} else {
					// if the user wants to export the clean HTML, we need to wait for the render to finish
					this.copyInProgressModal.close();
					const html = await cleanHtml(this.copyResult as HTMLElement, settings);
					navigator.clipboard
						.writeText(html)
						.then(() => new Notice("Cleaned HTML copied to the clipboard", 3500))
						.catch(() => new Notice("Couldn't copy html to the clipboard", 3500))
						.finally(() => this.endCopyProcess());
				}
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
