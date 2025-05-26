// js/logic/saved_audit_loader.js
// Denna modul hanterar logiken för att ladda och processa en sparad JSON-granskningsfil.

export const SavedAuditLoader = (function () {
    'use-strict';

    // Beroenden kommer att skickas in till loadAndProcessSavedAudit-funktionen.

    async function loadAndProcessSavedAudit(
        fileObject,                 // Filobjektet från <input type="file">
        validationLogic,            // Referens till ValidationLogic-modulen (eller dess funktion)
        dispatchFunction,           // Funktion för att skicka actions till store
        storeActionTypeForLoad,     // Specifik action-typ för att ladda granskning
        getStateFunction,           // Funktion för att hämta nuvarande app-version
        tFunction,                  // Översättningsfunktion
        notificationFunction,       // Funktion för att visa meddelanden
        successCallback,            // Callback som körs vid lyckad laddning och validering
        errorCallback               // Callback som körs vid fel
    ) {
        if (!fileObject) {
            if (errorCallback) errorCallback(tFunction('error_no_file_selected', { defaultValue: "No file selected."}));
            return;
        }

        if (fileObject.type !== "application/json") {
            if (errorCallback) errorCallback(tFunction('error_file_must_be_json'));
            return;
        }

        const reader = new FileReader();

        reader.onload = async function (e) {
            try {
                const file_content_object = JSON.parse(e.target.result);
                // Först, en grundläggande validering av den sparade filens struktur
                const validation_result = validationLogic.validate_saved_audit_file(file_content_object);

                if (validation_result.isValid) {
                    const current_app_state = getStateFunction(); // Hämta nuvarande state för att få appVersion
                    const current_app_state_version = current_app_state.saveFileVersion;

                    if (file_content_object.saveFileVersion > current_app_state_version) {
                        console.warn(`[SavedAuditLoader] Save file version (${file_content_object.saveFileVersion}) is newer than app state version (${current_app_state_version}).`);
                        if (notificationFunction) {
                            notificationFunction(
                                tFunction('warning_save_file_newer_version', {
                                    fileVersionInFile: file_content_object.saveFileVersion,
                                    appVersion: current_app_state_version
                                }),
                                'warning', 8000);
                        }
                    }

                    dispatchFunction({
                        type: storeActionTypeForLoad,
                        payload: file_content_object // Hela objektet skickas till storen
                    });

                    if (notificationFunction) notificationFunction(tFunction('saved_audit_loaded_successfully'), 'success');
                    if (successCallback) successCallback();

                } else {
                    // Valideringen av den sparade filen misslyckades
                    if (errorCallback) errorCallback(validation_result.message);
                }
            } catch (error) {
                console.error("[SavedAuditLoader] Error parsing JSON from saved audit file:", error);
                if (errorCallback) errorCallback(tFunction('error_invalid_saved_audit_file'));
            }
        };

        reader.onerror = function () {
            console.error("[SavedAuditLoader] Error reading saved audit file.");
            if (errorCallback) errorCallback(tFunction('error_file_read_error'));
        };

        reader.readAsText(fileObject);
    }

    return {
        loadAndProcessSavedAudit
    };
})();