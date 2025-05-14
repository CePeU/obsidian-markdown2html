import { App, Modal, debounce, ExtraButtonComponent, PluginSettingTab, Setting, TextComponent, ButtonComponent } from "obsidian";
import Markdown2Html from "src/plugin";
import { isEmpty } from "./utils";
import { isAsyncFunction } from "util/types";
import { text } from "stream/consumers";
import { debug, table } from "console";
import { markAsUntransferable } from "worker_threads";
import { validateHeaderName } from "http";


export interface Markdown2HtmlSettings {
	attributeList: string[];
	classList: string[];
	isActiveProfile: boolean;
	exportCleaned: true;
	rulesArray: string[][];
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
	rulesArray: [["div", "p"]], 
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
			.setName("Reset classes to keep")
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
	
	//Button for Modal and Class Mapping
	new Setting(containerEl).setHeading().setName("Classes/Attributes for HTML tags");
	new Setting(containerEl)
			.setName("Add additional Classes/Attributes for HTML tags")
			.setDesc(`This allows you to add Classes and Attributes to HTML tags during export. The rules set up here run as a last step in the export.`)
			.addButton(button =>
				button
					.setIcon("list-plus")
					.setTooltip("Add classes according to rules")
					.onClick(() => {
						//new RulesModal(this.app).open();
						//new RulesModal(this.app).open();
						const arrayForModal: string[][] = this.profileSettings[this.activeProfile].rulesArray;
						console.log("==> Rules Array",arrayForModal);					
						/*[
							['name', 'John'],
							['age', '30'],
							['city', 'New York']
						]*/;
				
						// Create and show modal
						//const modal = new MapEditorModal(this.app, sampleMap, (updatedMap) => {
						//	console.log('Updated map:', updatedMap);
						//});
						const modal = new RuleEditorModal(this.app, arrayForModal, (updatedMap) => {
							console.log('Updated map:', updatedMap);
						});
						modal.open();
						/*const modal = new MapEditorModal2(this.app, sampleMap);
						console.log("==> New Modal and code to implement");*/
						
					})
			);

	//Toggel for debug logging
	new Setting(this.containerEl)
      .setName("Debug logging")
      .setDesc("Whether debug logging should be on or off.")
      .addToggle((toggle) => {
        toggle.setValue(true);
        toggle.onChange(async (value) => {
			if (value) {
				console.log("==> Debug logging is on");
			} else {
				console.log("==> Debug logging is off");
			}
        });
      });

		} // End of display function

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
								rulesArray:[["", ""]],	
							};
							
							this.display
						}
						this.containerEl.empty();
						this.display();

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
				this.containerEl.empty();
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
    text.setPlaceholder(`Input ${i}`); //label
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

export class MapEditorModal extends Modal {
	mapData: Map<string, string>;
	containerEl: HTMLElement;

    //constructor(app: App, mapData: Map<string, string>, onSave?: (newMap: Map<string, string>) => void) {
	constructor(app: App, mapData: Map<string, string>) {
	super(app);
	this.mapData = new Map(mapData);
        //this.onSave = onSave;
	}

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
        // Create main container with scrolling
        this.containerEl = contentEl.createDiv({
            cls: 'map-editor-container',
            attr: {
                style: `
                    max-height: 80vh;
                    overflow-y: auto;
                    padding: 20px;
                `
            }
        });

        // Create grid layout for two columns
        const gridContainer = this.containerEl.createDiv('grid-container');
        gridContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            width: 100%;
        `;

        // Add key-value pairs to grid
        let rowIndex = 0;
        this.mapData.forEach((value, key) => {
            // Create row container
            const rowContainer = gridContainer.createDiv(`row-${rowIndex}`);
            rowContainer.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
            `;

            // Key label
            const keyLabel = rowContainer.createSpan({
                text: key,
                cls: 'key-label'
            });
            
            // Value input
            const valueInput = rowContainer.createEl('input', {
                cls: 'value-input',
                attr: {
                    type: 'text',
                    value: value,
                    placeholder: 'Enter value...'
                }
            });

            // Update handler
            valueInput.addEventListener('change', () => {
                this.mapData.set(key, valueInput.value);
               // if (this.onSave) {
                //    this.onSave(new Map(this.mapData));
                //}
            });

            rowIndex++;
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export class RuleEditorModal extends Modal {
	private _rulesData: string[][];
	private onSave?: (newRulesData: string[][]) => void;

	constructor(app: App, rulesData: string[][], onSave?: (newRulesData: string[][]) => void) {
		super(app);
		this._rulesData = rulesData;
		this.onSave = onSave;
	}
	get rulesData(): string[][] {
		return this._rulesData;
	}	
	
	display() {
	const { contentEl } = this;
	contentEl.empty();

		

	// Enable vertical scrolling
	contentEl.style.overflowY = 'auto';
	//contentEl.style.maxHeight = '70vh'; // 70% of viewport height
	
	contentEl.style.overflowX = 'auto'; // Enable horizontal scrolling
	//contentEl.style.width = '80%'; // Set width to 100% of the viewport
        // Create main container
		//const tableHeading= contentEl.createDiv();
		//tableHeading.setText("Order");


		const container = contentEl.createDiv();
		container.createEl('h2').setText("Replacement Rules");
		const tableHeader = container.createDiv();
		//tableHeader.createSpan('table-header-Order').setText("Order");
		tableHeader.createSpan('table-header-Rules').setText("Rules");
		tableHeader.createSpan('table-header-Replacmente').setText("Replacment");
		container.createEl('br');

		const inputNewRule = new Setting(container);
		inputNewRule.addText(text => {
			
			text.inputEl.style.width = "100%";
		
			text.setPlaceholder("Enter new rule to add ...");
			text.setValue("");
			text.inputEl.setAttribute("id", `newRule`);
			text.inputEl.setAttribute("name", `newRule`);
			text.inputEl.addEventListener("keypress", (e: KeyboardEvent) => {
				if (e.key === "Enter") {
					this.rulesData.push([text.inputEl.value,""]);
					console.log("==> New Rule Value",text.inputEl.value);
					this.display();
					const newInputEl = document.getElementById("newRule") as HTMLInputElement;
					if (newInputEl) {
						newInputEl.focus();
					}	
					//text.inputEl.focus();
					//text.inputEl.value = "";
				}
			});
		
	 });

		// Add key-value pairs
		this.rulesData.forEach((rule, index, array) => {
            // Create key label
			//const ruleNumber = container.createSpan();
			//ruleNumber.setText('Rule ' + index + ': ');

            // Create space between label and input
			//container.createSpan().setText(' ');
			
//const ruleContainer = container.createDiv('rule-container');
/*	attr: {
		type: 'text',
		value: rule[0],
		placeholder: 'Enter value...',
		id: `${index}`
	}
});*/

const SingleElement = new Setting(container);
//SingleElement.setName(index+":");
//SingleElement.setName("");
// Style the label width (setName output)
//const labelEl = SingleElement.settingEl.querySelector('.setting-item-name') as HTMLElement;
//if (labelEl) {
//	labelEl.style.width = "5%"; // or 150px, etc.
//}

// Remove the div element which contains the label and creates the first column
const labelEl = SingleElement.settingEl.querySelector('.setting-item-info');
console.log("==> labelEl",labelEl);
if (labelEl) {
	labelEl.remove();
}

SingleElement.addText(text => {
	 // Set the width of the input field (e.g., 300px)
	text.inputEl.style.width = "100%";

	 // Optionally, set the font size (e.g., 18px)
	//text.inputEl.style.fontSize = "18px";
	//text.inputEl.style.fontFamily = "monospace";

	text.setPlaceholder("Enter rule...");
	text.setValue(rule[0]);
	text.inputEl.setAttribute("id", `${index}`);
	text.inputEl.setAttribute("name", `itemRowA-${index}`);
	text.inputEl.addEventListener("change", () => {
		const currentRuleValue = rule[0]; // Get the  rule value
		const indexNumber: number = +text.inputEl.id;
		console.log("==> currentRuleValue",currentRuleValue);
		console.log("==> index",index);
		console.log("==> inputField.value",text.inputEl.value);
		// Check if the currentRuleValue is not empty
		if (text.inputEl.value === "") {
			// If the currentRuleValue is empty, remove the rule from the rulesData array
			this.rulesData.splice(indexNumber, 1);
			this.display();
		} else if (currentRuleValue) {
			// If the currentRuleValue is not empty, update the value in the rulesData array	

			// Update the value in the array
			this.rulesData[indexNumber][0] = text.inputEl.value;
			console.log("==> IF inputKey.value",text.inputEl.value);
		}
		console.log("==> New Rule Data",this.rulesData[indexNumber][0]);});
		if (this.onSave) { //Check if this makes sense and how callback works
			this.onSave(this._rulesData);
		}
	text.inputEl.addEventListener("keypress", (e: KeyboardEvent) => {
		if (e.key === "Enter") {
			console.log("==> Enter");
		}
	});
});
SingleElement.addText(text => {
	text.inputEl.style.width = "100%";
	text.setPlaceholder("Enter replacement...");
	text.setValue(rule[1]);
	text.inputEl.setAttribute("id", `${index}`);
	text.inputEl.setAttribute("name", `itemRowB-${index}`);

	text.inputEl.addEventListener("change", () => {
		//const currentRuleValue = rule[1];
		const indexNumber: number = +text.inputEl.id;
		//console.log("==> currentRuleValue",currentRuleValue);
		console.log("==> index",index);
		console.log("==> inputField.value",text.inputEl.value);
		
			// Update the value in the mapData
			this.rulesData[indexNumber][1] = text.inputEl.value;
			console.log("==> IF inputKey.value",text.inputEl.value);
		
		console.log("==> New Rule Data",this.rulesData[indexNumber][1]);});

	text.inputEl.addEventListener("keypress", (e: KeyboardEvent) => {
		if (e.key === "Enter") {
			console.log("==> Enter");
		}
	});
});
 // Add the plus button
SingleElement.addExtraButton((button) =>{ 
	button.setIcon("circle-arrow-up");
	button.onClick(() => {
		
		const indexNumber: number = +button.extraSettingsEl.id;
		
		console.log("==> index",index);
	//exchange the order of the rules
		if (indexNumber > 0) {
			const temp = this.rulesData[indexNumber];
			this.rulesData[indexNumber] = this.rulesData[indexNumber - 1];
			this.rulesData[indexNumber - 1] = temp;
			this.display();
		}
		console.log("==> Button " + button.extraSettingsEl.getAttribute("id") +" up clicked");
	});
	button.extraSettingsEl.setAttribute("id", `${index}`);
	button.extraSettingsEl.setAttribute("name", `ButtonUp`);
	console.log("==> Button " + button.extraSettingsEl.getAttribute("id") +" up clicked")
});
SingleElement.addExtraButton(button => {
	button.setIcon("circle-arrow-down");
	button.onClick(() => {
		const indexNumber: number = +button.extraSettingsEl.id;
		
		console.log("==> index",index);
	//exchange the order of the rules
		if (indexNumber < this.rulesData.length-1) {
			console.log("==> indexNumber",indexNumber);
			console.log("==> this.rulesData.length",this.rulesData.length);
			const temp = this.rulesData[indexNumber];
			this.rulesData[indexNumber] = this.rulesData[indexNumber + 1];
			this.rulesData[indexNumber + 1] = temp;
			this.display();
		}
		console.log("==> Button " + button.extraSettingsEl.getAttribute("id") +" down clicked");
	});
	button.extraSettingsEl.setAttribute("id", `${index}`);
	button.extraSettingsEl.setAttribute("name", `ButtonDown`);
	console.log("==> Button " + button.extraSettingsEl.getAttribute("id") +" up clicked")
});


/*
const ruleAddButton = container.createEl("button", { text: "Click Me"});
ruleAddButton.createSpan({ cls: "lucide lucide-plus" });
ruleAddButton.setAttribute("icon", "list-plus");
ruleAddButton.setAttribute("id", `${index}`);
ruleAddButton.onClickEvent(() => {
	console.log("==> Button clicked", ruleAddButton);
	console.log("==> Button ID ", ruleAddButton.id);
	console.log("==> Button TextContent ", ruleAddButton.textContent);
	console.log("==> Button Value ", ruleAddButton.value);
	console.log("==> Button indexNumber ", index);
	// Perform your action here	
	// Add your logic here
	// For example, you can add a new rule to the rulesData array
	//this.rulesData.push(["", ""]);
});			

container.createEl('br');

//==============================================
// Update handler
inputRuleName.addEventListener('change', () => {
	// Find key in mapData

	const currentRuleValue = rule[0];
	const indexNumber: number = +inputRuleName.id;
	console.log("==> currentRuleValue",currentRuleValue);
	console.log("==> index",index);
	console.log("==> inputField.value",inputRuleName.value);
if (currentRuleValue) {
	// Update the value in the mapData
	
	this._rulesData[indexNumber][0] = inputRuleName.value;
	console.log("==> IF inputKey.value",inputRuleName.value);
} 
console.log("==> New Rule Data",this._rulesData[indexNumber][0]);
/*else {
	// If the key doesn't exist, add it to the mapData if it is not empty
	if (inputRuleName.value.trim() !== "") {
		this._mapData[index][0]= "";
	}
}*/
/*if (this.onSave) {
	this.onSave(this._rulesData);
	console.log("==> this.OnSave",this.onSave);
}*/
//this.mapData.delete(key); // Remove the old key
/*if (inputRuleName.value.trim() === "") {
	this.rulesData.splice(indexNumber,1);// Delete empty keys
	this.display() 
}*/
//console.log("==> this.mapData",this._mapData);
	/*this.mapData.set(key, inputKey.value);
	if (this.onSave) {
		this.onSave(new Map(this.mapData));
	}*/
//});*/
		});
/*
            // Create inputReplacment field
            const inputReplacement = container.createEl('input', {
                attr: {
                    type: 'text',
                    value: value,
                    placeholder: 'Enter value...'
                }
            });

            // Add line break after each pair
            container.createEl('br');

            // Update handler
            inputReplacement.addEventListener('change', () => {
                this._mapData.set(key, inputReplacement.value);
                if (this.onSave) {
                    this.onSave(new Map(this._mapData));
                }
            });
        });*/
	}

	onOpen() {
	this.modalEl.style.width = "80%"; // Set width to 80% of the viewport
	this.display();
}

	onClose() {
		
		const { contentEl } = this;
		contentEl.empty();
	}
}