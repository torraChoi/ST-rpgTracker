import { eventSource, event_types } from "../../../../script.js";
import { extension_settings } from "../../../../../../scripts/extensions.js";
import { SlashCommand } from "../../../slash-commands/SlashCommand.js";
import { SlashCommandParser } from "../../../slash-commands/SlashCommandParser.js";
import { ARGUMENT_TYPE, SlashCommandNamedArgument } from "../../../slash-commands/SlashCommandArgument.js";
import { commonEnumProviders } from "../../../slash-commands/SlashCommandCommonEnumsProvider.js";
import { SlashCommandEnumValue  } from "../../../slash-commands/SlashCommandEnumValue.js";

import { textgenerationwebui_settings as textgen_settings, textgen_types } from "../../../../scripts/textgen-settings.js";
import { oai_settings } from "../../../../scripts/openai.js";
import { nai_settings } from "../../../../scripts/nai-settings.js";
import { horde_settings } from "../../../../scripts/horde.js";
import { kai_settings } from "../../../../scripts/kai-settings.js";

import { initSettings } from "./src/settings/settings.js";
import { eventHandlers } from "./src/events.js";

import { registerGenerationMutexListeners } from './lib/interconnection.js';
import { TrackerInterface } from "./src/ui/trackerInterface.js";
import { TrackerPreviewManager } from "./src/ui/trackerPreviewManager.js";
import { generateTrackerCommand, getTrackerCommand, saveTrackerToMessageCommand, stateTrackerCommand, trackerOverrideCommand } from "./src/commands.js";
import { FIELD_INCLUDE_OPTIONS } from "./src/trackerDataHandler.js";

export const extensionName = "rpgTracker";
const extensionNameLong = `ST-${extensionName}`;
export const extensionFolderPath = `scripts/extensions/third-party/${extensionNameLong}`;

if (!extension_settings[extensionName.toLowerCase()]) extension_settings[extensionName.toLowerCase()] = {};
export const extensionSettings = extension_settings[extensionName.toLowerCase()];

jQuery(async () => {
	await initSettings();
	await TrackerInterface.initializeTrackerButtons();
	TrackerPreviewManager.init();
});

// put this once, after you define your init/injectSettings function
const { eventSource, event_types } = SillyTavern.getContext();
eventSource.on(event_types.APP_READY, injectSettings);
eventSource.on(event_types.SETTINGS_LOADED, injectSettings);


registerGenerationMutexListeners();

eventSource.on(event_types.CHAT_CHANGED, eventHandlers.onChatChanged);
eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, eventHandlers.onCharacterMessageRendered);
eventSource.on(event_types.USER_MESSAGE_RENDERED, eventHandlers.onUserMessageRendered);
eventSource.on(event_types.GENERATION_AFTER_COMMANDS, eventHandlers.onGenerateAfterCommands);
eventSource.on(event_types.GENERATE_AFTER_COMBINE_PROMPTS, eventHandlers.generateAfterCombinePrompts);


SlashCommandParser.addCommandObject(SlashCommand.fromProps({
	name: 'generate-tracker',
	callback: generateTrackerCommand,
	returns: 'The tracker JSON object.',
	namedArgumentList: [
		SlashCommandNamedArgument.fromProps({
			name: 'message',
			description: 'generate tracker for specific message',
			typeList: [ARGUMENT_TYPE.NUMBER],
			isRequired: false,
			enumProvider: commonEnumProviders.messages(),
		}),
		SlashCommandNamedArgument.fromProps({
			name: 'include',
			description: 'which fields to include in the tracker generation',
			typeList: [ARGUMENT_TYPE.string],
			isRequired: false,
			defaultValue: 'DYNAMIC',
			enumProvider: ()=> Object.keys(FIELD_INCLUDE_OPTIONS).map(key=>new SlashCommandEnumValue(key.toLowerCase())),
		}),
	],
	helpString: 'Generates a tracker for the given message. If no message is provided, the tracker will be generated for the last non-system message.',
	aliases: ['gen-tracker'],
}));

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
	name: 'tracker-override',
	callback: trackerOverrideCommand,
	returns: 'The tracker JSON object.',
	namedArgumentList: [
		SlashCommandNamedArgument.fromProps({
			name: 'tracker',
			description: 'the tracker used to override',
			typeList: [ARGUMENT_TYPE.STRING],
			isRequired: true,
		}),
	],
	helpString: 'Overrides the tracker used for the next generation with the provided tracker.',
}));

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
	name: 'save-tracker',
	callback: saveTrackerToMessageCommand,
	returns: 'The tracker JSON object.',
	namedArgumentList: [
		SlashCommandNamedArgument.fromProps({
			name: 'message',
			description: 'message to add tracker to',
			typeList: [ARGUMENT_TYPE.NUMBER],
			isRequired: false,
			enumProvider: commonEnumProviders.messages(),
		}),
		SlashCommandNamedArgument.fromProps({
			name: 'tracker',
			description: 'the tracker to save',
			typeList: [ARGUMENT_TYPE.STRING],
			isRequired: true,
		}),
	],
	helpString: 'Saves tracker to message. If no message is provided, the tracker will be saved to the last non-system message.',
}));

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
	name: 'get-tracker',
	callback: getTrackerCommand,
	returns: 'The tracker JSON object.',
	namedArgumentList: [
		SlashCommandNamedArgument.fromProps({
			name: 'message',
			description: 'message to retrieve tracker from',
			typeList: [ARGUMENT_TYPE.NUMBER],
			isRequired: false,
			enumProvider: commonEnumProviders.messages(),
		}),
	],
	helpString: 'Retrieves the tracker from the specified message. If no message is provided, the tracker will be retrieved from the last non-system message.',
}));

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
	name: 'tracker-state',
	callback: stateTrackerCommand,
	returns: 'The current tracker extension state.',
	namedArgumentList: [
		SlashCommandNamedArgument.fromProps({
			name: 'enabled',
			description: 'whether to enable or disable the tracker extension',
			typeList: [ARGUMENT_TYPE.BOOLEAN],
			isRequired: false,
		}),
	],
	helpString: 'Get or set the tracker extension enabled/dissabled state.',
	aliases: ['toggle-tracker'],
}));



// put at the very end of index.js
(function ensureSettingsInjected(){
  const root = typeof extensionFolderPath === 'string'
    ? extensionFolderPath
    : '/scripts/extensions/third-party/ST-rpgTracker';

  async function inject() {
    try {
      const panel = document.querySelector('#extensions_settings, #extensions-settings, #extensionsSettings');
      if (!panel) return; // panel not mounted yet
      const url = `${root}/html/settings.html`;
      const resp = await fetch(url, { cache: 'no-store' });
      if (!resp.ok) { console.warn('[rpgTracker] settings missing at', url, resp.status); return; }
      const html = await resp.text();

      let mount = panel.querySelector('#rpgtracker-settings-root');
      if (!mount) {
        mount = document.createElement('div');
        mount.id = 'rpgtracker-settings-root';
        panel.appendChild(mount);
      }
      mount.innerHTML = html;
      console.log('[rpgTracker] settings injected from', url);
    } catch (e) {
      console.error('[rpgTracker] inject settings failed', e);
    }
  }

  window.addEventListener('load', () => {
    try {
      const { eventSource, event_types } = SillyTavern.getContext();
      eventSource.on(event_types.APP_READY, inject);
      eventSource.on(event_types.SETTINGS_LOADED, inject);
      setTimeout(inject, 500); // belt & suspenders
    } catch {
      setTimeout(inject, 800);
    }
  });
})();
