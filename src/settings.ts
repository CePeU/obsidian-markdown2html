import { App, Modal, debounce, ExtraButtonComponent, PluginSettingTab, Setting, TextComponent } from "obsidian";
import Markdown2Html from "src/plugin";
import { isEmpty } from "./utils";
import { isAsyncFunction } from "util/types";
import { text } from "stream/consumers";


export interface Markdown2HtmlSettings {
	attributeList: string[];
	classList: string[];
	isActiveProfile: boolean;
	exportCleaned: true;
	rulesMap: Map<string, string>;
}

export interface ProfileSettings  {
	[profileName: string]: Markdown2HtmlSettings;
}


export const DEFAULT_SETTINGS: ProfileSettings = {
	default: {
	attributeList: ["id", "href", "src", "width", "height", "alt", "colspan", "rowspan"],
	classList: [],
	isActiveProfile: true,
	exportCleaned: true,
	rulesMap:new Map<string, string>([["div", "p"]]), 
}};

//let _profileName :string = 'default';

export class Markdown2HtmlSettingsTab extends PluginSettingTab {
	private plugin: Markdown2Html;
	private profiledata: ProfileSettings;
	activeProfile: string;
	private data: Markdown2HtmlSettings;//Markdown2HtmlSettings;

	constructor(app: App, plugin: Markdown2Html) {
		super(app, plugin);
		this.plugin = plugin;
		this.loadSettings();
		//this.data = this.profiledata['default'];
	}

	get settings():  Markdown2HtmlSettings {
		//let activeProfile: string = 'default';
		//this.data = this.profiledata[activeProfile];
	// BETTER TO IMPLEMENT A FUNCTION TO GET THE ACTIVE PROFILE HERE?
	//After implementing setter not necessary anymore
		//let activeProfile: string = Object.keys(this.profiledata).find(key => this.profiledata[key].isActiveProfile === true) || "default";
		//this.data = this.profiledata[activeProfile];
		return this.data;
	}

	get profileSettings():  ProfileSettings {
		//let activeProfile: string = 'default';
		//this.data = this.profiledata[activeProfile];
		return this.profiledata;
	}

	set ActiveMarkdown2HtmlSettingsData(dataFromProfile: ProfileSettings) {
		//this.data=DEFAULT_SETTINGS['default'];
		if (dataFromProfile) {
			let activeProfile: string = Object.keys(dataFromProfile).find(key => dataFromProfile[key].isActiveProfile === true) || "default";
			this.activeProfile = activeProfile; //eventuell unnötig es sei denn ich kann es extern woanders verwenden
			this.data=dataFromProfile[activeProfile];
		}	
	}
	

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setHeading().setName("Active Profile");
		new Setting(containerEl).setDesc("Select active profile to be used from the dropdown")
		 .addDropdown(dropdown => {
			let dropdownList: string[] = Object.keys(this.profiledata).sort();
			for (let i = 0; i < dropdownList.length; i++) {
				dropdown.addOption(dropdownList[i], dropdownList[i]);
			} //Just builds the dropdown list with the profile names to display
			 // Set the current value from settings
			//dropdown.setValue(this.activeProfile);
			dropdown.setValue(this.activeProfile);
			// Handle onChange event
			dropdown.onChange(async (value: string) => {
				this.data.isActiveProfile = false;
				this.profiledata[value].isActiveProfile = true;
				this.ActiveMarkdown2HtmlSettingsData = this.profiledata;
				
				//await this.plugin.saveSettings();
				// Optional: you can call this.display() here if you want to refresh the settings tab
			console.log("==>Dropdown refresh",this.profiledata);
			this.save(); // Save the settings and the new active profile
			this.display(); //refresh the settings tab to show the new active profile
			
			});
			
			
		}); //End of dropdown

		new Setting(containerEl).setHeading().setName("Profiles");
		this.newListSetting(
			containerEl,
			"Existing Profiles",
			"Add a profile or remove a profile.",
			"Add a profile",
			 settings =>  Object.keys(this.profiledata).sort(),
			 true
		);

		new Setting(containerEl).setHeading().setName("Attributes");
		
		this.newListSetting(
			containerEl,
			"Attributes to keep",
			"Add attribute name(s) you want to keep when rendering markdown to HTML.",
			"Add attribute to keep",
			settings => settings.attributeList.sort()
			// The getter function "settings" accesses this.data and can be used like a property
			// this is inherenttly given by the keywoard get
			// so in effect there stands this.data.attributeList.sort()
			//
		);

		
		new Setting(containerEl)
			.setName("Reset Attributes")
			.setDesc(
				`It is recommended to keep the default attributes. In case you accidentaly deleted some or all of them, you can reset them to the default values (${DEFAULT_SETTINGS.default.attributeList.join(", ")}).`
			)
			.addButton(button =>
				button
					.setIcon("list-restart")
					.setTooltip("Reset Attributes to default")
					.onClick(() => {
						//check first for default profile exists and was not deleted
						if (this.profileSettings[this.activeProfile] === undefined) {
							this.profileSettings['default'] = DEFAULT_SETTINGS['default'];
							this.profileSettings['default'].isActiveProfile = true;
							this.activeProfile = 'default';
						}
						//this.profileSettings[this.activeProfile].isActiveProfile = true;	

						this.profileSettings[this.activeProfile].attributeList = Array.from(DEFAULT_SETTINGS.default.attributeList);
						
						//this.data.attributeList = Array.from(DEFAULT_SETTINGS.default.attributeList);
						console.log("==>Reset Attributes",this.profileSettings[this.activeProfile].attributeList);
						this.save();
						this.display();
					})
			);

		new Setting(containerEl).setHeading().setName("Classes");
		this.newListSetting(
			containerEl,
			"Classes to keep",
			"Add class name(s) you want to keep when rendering markdown to HTML.",
			"Add class to keep",
			settings => settings.classList.sort() 
		);

		new Setting(containerEl)
			.setName("Delete all Classes")
			.setDesc(
				`If you want a clean export just press this button.`
			)
			.addButton(button =>
				button
					.setIcon("list-restart")
					.setTooltip("Removes all classes from Profile")
					.onClick(() => {
						//check first for default profile exists and was not deleted
						if (this.profileSettings[this.activeProfile] === undefined) {
							this.profileSettings['default'] = DEFAULT_SETTINGS['default'];
							this.profileSettings['default'].isActiveProfile = true;
							this.activeProfile = 'default';
						}
						//this.profileSettings[this.activeProfile].isActiveProfile = true;	

						this.profileSettings[this.activeProfile].classList = [];
						
						//this.data.attributeList = Array.from(DEFAULT_SETTINGS.default.attributeList);
						console.log("==>Remove all Classes",this.profileSettings[this.activeProfile].classList);
						this.save();
						this.display();
					})
			);
	
		new Setting(containerEl).setHeading().setName("Classes/Attributes for HTML tags");
	new Setting(containerEl)
			.setName("Add additional Classes/Attributes for HTML tags")
			.setDesc(`This allows you to add Classes and Attributes to HTML tags during export. The rules set up here run as a last step in the export.`)
			.addButton(button =>
				button
					.setIcon("list-plus")
					.setTooltip("Add classes according to rules")
					.onClick(() => {
						new RulesModal(this.app).open();
						console.log("==> New Modal and code to implement");
						
					})
			);
		}

	private newListSetting(
		containerEl: HTMLElement,// Container for the setting
		name: string,// Display name
		desc: string,// Description text
		buttonTooltip: string,// Tooltip for add button
		listContent: (settings: Markdown2HtmlSettings) => string[],// List accessor
		isProfile?: boolean // Optional parameter to check if it is a profile
	) {// Create the setting and container
		const setting = new Setting(containerEl).setName(name).setDesc(desc);
		const listDiv = createDiv({ cls: ["setting-command-hotkeys", "md2html-list"] });
		// setting.settingEl.classList.add("md2html-list-setting");
		containerEl.appendChild(listDiv);
// Initialize input and add event listeners
		let input: TextComponent;
		const addElement = async () => {
			input
				.getValue()
				.split(/[, ]/g)
				.forEach(value => {
					// replace invalid characters
					value = value.replace(/[ ~!@$%^&*()+=,./';:"?><\[\]\\\{\}|`#]/g, "");
//===>Hier unterscheiden ob es ein profile ist oder nicht ==> erfolgt über den Parameter isProfile
					
					// add to list if not already in list
					if (!isEmpty(value) && !listContent(this.data).contains(value)) {
						listContent(this.data).push(value);
						if (isProfile) {
							this.addListElement(listDiv, value, listContent, true);
						} else {
						this.addListElement(listDiv, value, listContent);}

						if (isProfile) {
							this.profiledata[value] = {
								attributeList: [],
								classList: [],
								isActiveProfile: false,
								exportCleaned: true,
								rulesMap:new Map<string, string>([["", ""]]),
							};
							this.display
						}


						this.save();
						input.setValue("");
					} else {
						input.inputEl.focus();
					}
					
				});
		};

		setting.addText(text => {
				input = text;
				input.inputEl.addEventListener("keypress", (e: KeyboardEvent) => {
					if (e.key === "Enter") {
						e.preventDefault();
						addElement();
					}
				});
			})
			 // Add the plus button
		setting.addExtraButton(button => button.setIcon("plus-circle").setTooltip(buttonTooltip).onClick(addElement));

		// Initialize the list with existing values
		listContent(this.data).forEach(value => {
			this.addListElement(listDiv, value, listContent,isProfile);
		});
	}

	private addListElement(
		containerEl: HTMLElement,
		elementName: string,
		listContent: (settings: Markdown2HtmlSettings) => string[],
		istProfile?: boolean // Optional parameter to check if it is a profile
	) {
		const elementSpan = createSpan({ cls: "setting-hotkey", parent: containerEl });
		elementSpan.setText(elementName);

		const delBtn = new ExtraButtonComponent(elementSpan);
		delBtn.setIcon("cross");
		delBtn.setTooltip(`Delete '${elementName}' from list`);
		//==> removal of the element from the list
		delBtn.onClick(() => {
			

			if (listContent(this.data).contains(elementName)) {

				console.log("==> istProfile:", istProfile);
				console.log("==> Profile ALL", this.profileSettings);
				console.log("==> Element", elementName);
				console.log("==> Profile deleted", this.profileSettings[elementName]);
				console.log("this.data", this.data);
				
			if (istProfile) {
				console.log("==> HEUREKA:", istProfile);
				delete this.profileSettings[elementName];
				this.display();
				};



				listContent(this.data).remove(elementName);



				this.save();
				elementSpan.remove();
			}
		});
	}

	/**
	 * Load settings on start-up.
	 */
	private async loadSettings() {
		this.profiledata = Object.assign({}, DEFAULT_SETTINGS, await this.plugin.loadData());
		console.log("LOAD==>",this.profiledata);
		this.ActiveMarkdown2HtmlSettingsData = this.profiledata;
	}

	/**
	 * save current settings
	 */
	private save = debounce(
		async () => {
			await this.plugin.saveData(this.profiledata);
			console.log("SAVE==>",this.profiledata);
		},
		250,
		true
	);
}

class RulesModal extends Modal {
	constructor(app: App) {
	  super(app);
	}
	onOpen() {
	const { contentEl } = this;
	contentEl.setText("This is your modal form!");
	
	 // Enable vertical scrolling
	 contentEl.style.overflowY = 'auto';
	 contentEl.style.maxHeight = '70vh'; // 70% of viewport height

	     // Create input container
	const container = contentEl.createDiv();
    
		 // Add text input
		 new Setting(container)
		   .setName('Enter your text')
		   .addText(text => 
		text
			 .onChange(value => console.log(value))
		   );

		   // Add multiple elements to demonstrate scrolling
		   let a: number = 0;
		   let b: number = 0;
    for (let i = 1; i <= 20; i++) {
	
		new Setting(container)
  .setName(`Item ${i}`)
  .addText(text => {
    text.setPlaceholder(`Input ${i}`);
    if (i % 2 === 0) {
      b += 1;
      text.inputEl.name = `itemRowB-${b}`;
      text.inputEl.id = `itemRowB-${b}`;
    } else {
      a += 1;
      text.inputEl.name = `itemRowA-${a}`;
    }
  }); // closer for addText

	  } //closer for for loop
	//console.log("Textfield 10:",this.contentEl['itemRowA-5']);
	  // Add form elements here as needed
	} // closer for onOpen
	onClose() {
	  this.contentEl.empty();
	} //closer for onClose
  } // closer for modal