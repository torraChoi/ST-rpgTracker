import { animation_duration, chat } from "../../../../../../script.js";
import { dragElement } from "../../../../../../scripts/RossAscends-mods.js";
import { loadMovingUIState } from "../../../../../../scripts/power-user.js";
import { extensionSettings } from "../../index.js";
import { error, getPreviousNonSystemMessageIndex, getLastNonSystemMessageIndex, debug, getLastMessageWithTracker } from "../../lib/utils.js";
import { generateTracker } from "../generation.js";
import { FIELD_INCLUDE_OPTIONS, getTracker, OUTPUT_FORMATS, saveTracker } from "../trackerDataHandler.js";
import { TrackerContentRenderer } from './components/trackerContentRenderer.js';

export class TrackerInterface {
    constructor() {
        if (TrackerInterface.instance) {
            return TrackerInterface.instance;
        }
        TrackerInterface.instance = this;

        this.schema = extensionSettings.trackerDef;
        this.renderer = new TrackerContentRenderer();
        this.container = null;
        this.tracker = null;
        this.mesId = null;
        this.mode = 'view'; // 'view' or 'edit'
        this.onSave = null; // Callback function when tracker is updated
    }

    /**
     * Initializes and displays the tracker interface.
     * @param {object} tracker - The tracker data object.
     * @param {function} onSave - Callback function to save the updated tracker.
     * @param {string} [template] - Optional custom template string.
     */
    init(tracker, mesId, onSave) {
        debug("Initializing Tracker Interface", {tracker, mesId, onSave});
        this.tracker = tracker;
        this.mesId = mesId;
        this.onSave = onSave;

        if (this.container) {
            this.switchMode('view');
        }
    }

    /**
     * Creates the UI elements for the interface using the zoomed_avatar_template.
     */
    createUI() {
        // Use the zoomed_avatar_template
        const template = $("#zoomed_avatar_template").html();
        const controlBarHtml = `<div class="panelControlBar flex-container">
            <div id="trackerInterfaceheader" class="fa-solid fa-grip drag-grabber hoverglow"></div>
            <div id="trackerInterfaceClose" class="fa-solid fa-circle-xmark hoverglow dragClose"></div>
        </div>`;
        const editorHeader = `<div id="trackerInterfaceHeader">Tracker</div>`;
        const editorContainer = `<div id="trackerInterfaceContents" class="scrollY"></div>`;
        const editorFooter = `<div id="trackerInterfaceFooter">
            <button id="trackerInterfaceViewButton" class="menu_button menu_button_default interactable" tabindex="0">View</button>
            <button id="trackerInterfaceEditButton" class="menu_button menu_button_default interactable" tabindex="0">Edit</button>
            <button id="trackerInterfaceRegenerateTracker" class="menu_button menu_button_default interactable" tabindex="0">Regenerate</button>
            <select id="trackerInterfaceRegenOptions" class="tracker-regen-options">
                <option value="no-static">No Static Fields</option>
                <option value="all-fields">All Fields</option>
                <option value="static-only">Static Only</option>
            </select>
        </div>`;

        const newElement = $(template);
        newElement.attr("id", "trackerInterface").removeClass("zoomed_avatar").addClass("draggable").empty();
        newElement.append(controlBarHtml).append(editorHeader).append(editorContainer).append(editorFooter);
        $("#movingDivs").append(newElement);

        // Load UI state and make draggable
        loadMovingUIState();
        newElement.css("display", "flex").fadeIn(animation_duration);
        dragElement(newElement);

        // Close button event
        $("#trackerInterfaceClose")
            .off("click")
            .on("click", () => {
                this.close();
            });

        // Store references
        this.container = newElement;
        this.editorHeader = newElement.find('#trackerInterfaceHeader');
        this.contentArea = newElement.find('#trackerInterfaceContents');
        this.viewButton = newElement.find('#trackerInterfaceViewButton');
        this.editButton = newElement.find('#trackerInterfaceEditButton');
        this.regenerateButton = newElement.find('#trackerInterfaceRegenerateTracker');
        this.regenOptions = newElement.find('#trackerInterfaceRegenOptions');

        // Event handlers for buttons
        this.viewButton.on('click', () => this.switchMode('view'));
        this.editButton.on('click', () => this.switchMode('edit'));
        this.regenerateButton.on('click', () => this.regenerateTracker());
    }

    /**
     * Updates the content area based on the current mode.
     */
    refreshContent(mode = 'view') {
        this.contentArea.empty();
        this.editorHeader.text('Tracker' + (this.mesId ? ` - Message ${this.mesId}` : ''));

        if (mode === 'view') {
            const contentElement = this.renderer.renderDefaultView(this.tracker);
            this.contentArea.append(contentElement);
        } else if (mode === 'edit') {
            const contentElement = this.renderer.renderEditorView(this.tracker, (updatedTracker) => {
                this.tracker = updatedTracker;
                if (this.onSave) {
                    this.onSave(this.tracker);
                }
            });
            this.contentArea.append(contentElement);
        }
    }

    /**
     * Switches between 'view' and 'edit' modes.
     * @param {string} mode - The mode to switch to ('view' or 'edit').
     */
    switchMode(mode) {
        this.mode = mode;
        if (mode === 'view') {
            this.viewButton.hide();
            this.editButton.show();
        } else if (mode === 'edit') {
            this.viewButton.show();
            this.editButton.hide();
        }
        this.refreshContent(mode);
    }

    /**
     * Regenerates the tracker data based on selected options.
     */
    async regenerateTracker() {
        const option = this.regenOptions.val();
        let fieldIncludeOption;

        switch (option) {
            case 'all-fields':
                fieldIncludeOption = FIELD_INCLUDE_OPTIONS.ALL;
                break;
            case 'static-only':
                fieldIncludeOption = FIELD_INCLUDE_OPTIONS.STATIC;
                // Additional logic for static-only if needed
                break;
            default:
                fieldIncludeOption = FIELD_INCLUDE_OPTIONS.DYNAMIC;
        }

        // Show loading indicator
        this.contentArea.empty();
        const loadingIndicator = $('<div class="tracker-loading">Regenerating Tracker...</div>');
        this.contentArea.append(loadingIndicator);
        this.disableControls(true);

        try {
            // Placeholder for actual regeneration logic
			const previousMesId = getPreviousNonSystemMessageIndex(this.mesId);
            const newTracker = await generateTracker(previousMesId, fieldIncludeOption);
            let trackerUpdated;

            if (this.onSave) {
                trackerUpdated = await this.onSave(newTracker);
            }
            this.tracker = trackerUpdated;
            this.refreshContent(this.mode);
        } catch (e) {
            toastr.error('Regeneration failed. Please try again.');
            error('Regeneration error:', e);
            this.refreshContent(this.mode);
        } finally {
            this.disableControls(false);
        }
    }

    /**
     * Disables or enables the control buttons.
     * @param {boolean} disable - Whether to disable the controls.
     */
    disableControls(disable) {
        this.viewButton.prop('disabled', disable);
        this.editButton.prop('disabled', disable);
        this.regenerateButton.prop('disabled', disable);
        this.regenOptions.prop('disabled', disable);
    }

    /**
     * Closes the tracker interface and cleans up.
     */
    close() {
        if (this.container) {
            this.container.fadeOut(animation_duration, () => {
                this.container.remove();
                this.container = null;
                TrackerInterface.instance = null;
            });
        }
    }

    /**
     * Shows the tracker interface.
     */
    show() {
        if (!this.container) {
            this.createUI();
            this.switchMode(this.mode);
        }

        this.container.show()
    }

    /**
     * Static method to initialize the tracker buttons in the UI.
     * This method adds the tracker buttons to the UI and sets up event handlers.
     */
    static initializeTrackerButtons() {
        // Add Tracker button to the extensions menu
        const trackerInterfaceButton = $(`
            <div class="extension_container interactable" id="tracker_ui_container" tabindex="0">
                <div id="tracker-ui-item" class="list-group-item flex-container flexGap5 interactable" title="Open Tracker Interface" tabindex="0">
                    <div class="extensionsMenuExtensionButton fa-solid fa-code"></div>
                    Tracker
                </div>
            </div>
        `);
        $("#extensionsMenu").append(trackerInterfaceButton);

        // Tracker UI button event
        $("#tracker-ui-item").on("click", () => {
            const lastMesId = getLastMessageWithTracker();
            const mes = chat[lastMesId]?.tracker || {};
            const trackerData = getTracker(mes, extensionSettings.trackerDef, FIELD_INCLUDE_OPTIONS.ALL, true, OUTPUT_FORMATS.JSON);
            const onSave = async (updatedTracker) => {
                debug("Saving Tracker", {updatedTracker, lastMesId});
                return await saveTracker(updatedTracker, extensionSettings.trackerDef, lastMesId, true);
            };
            const trackerInterface = new TrackerInterface();
            trackerInterface.init(trackerData, lastMesId, onSave);
            trackerInterface.show();
        });

        // Add tracker button to message template
        const showMessageTrackerButton = $(`
            <div title="Show Message Tracker" class="mes_button mes_tracker_button fa-solid fa-code interactable" tabindex="0"></div>
        `);
        $("#message_template .mes_buttons .extraMesButtons").prepend(showMessageTrackerButton);

        // Message tracker button event
        $(document).on("click", ".mes_tracker_button", function () {
            const messageBlock = $(this).closest(".mes");
            const mesId = Number(messageBlock.attr("mesid"));
            const mes = chat[mesId]?.tracker || {};
            const trackerData = getTracker(mes, extensionSettings.trackerDef, FIELD_INCLUDE_OPTIONS.ALL, true, OUTPUT_FORMATS.JSON);
            debug("Message Tracker Data", {mesId, mes, trackerData});
            const onSave = async (updatedTracker) => {
                debug("Saving Tracker", {updatedTracker, mesId});
                return await saveTracker(updatedTracker, extensionSettings.trackerDef, mesId, true);
            };
            const trackerInterface = new TrackerInterface();
            trackerInterface.init(trackerData, mesId, onSave);
            trackerInterface.show();
        });
    }
}
