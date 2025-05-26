// js/components/SaveAuditButtonComponent.js

// NYTT: Importera specifika hjälpfunktioner (om de används direkt här, annars skickas de in)
// I detta fall skickas de in, så ingen direkt import behövs här.
// import { create_element, get_icon_svg, load_css } from '../../utils/helpers.js';

export const SaveAuditButtonComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/save_audit_button_component.css'; // Valfri
    let container_ref;
    let button_element;

    // Funktioner som skickas in vid init
    let getState_callback;
    let save_audit_function_ref;
    let t_function_ref;
    let show_notification_function_ref;
    // ÄNDRAD: Dessa kommer nu som separata funktioner, inte ett Helpers-objekt
    let local_create_element_ref;
    let local_get_icon_svg_ref;
    let local_load_css_ref;

    async function init(
        _container,
        _getState_cb,
        _save_audit_func,
        _t_func,
        _show_notification_func,
        // ÄNDRAD: Ta emot hjälpfunktioner individuellt
        _helpers_create_element,
        _helpers_get_icon_svg,
        _helpers_load_css
    ) {
        container_ref = _container;
        getState_callback = _getState_cb;
        save_audit_function_ref = _save_audit_func;
        t_function_ref = _t_func;
        show_notification_function_ref = _show_notification_func;
        local_create_element_ref = _helpers_create_element;
        local_get_icon_svg_ref = _helpers_get_icon_svg;
        local_load_css_ref = _helpers_load_css;

        if (local_load_css_ref && CSS_PATH) { // Använd den lokala referensen
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) await local_load_css_ref(CSS_PATH);
            } catch (error) {
                console.warn("Failed to load CSS for SaveAuditButtonComponent:", error);
            }
        }
    }

    function handle_save_click() {
        if (!getState_callback || !save_audit_function_ref || !t_function_ref || !show_notification_function_ref) {
            console.error("[SaveAuditButtonComponent] Dependencies not initialized for handle_save_click.");
            if (show_notification_function_ref && t_function_ref) {
                 show_notification_function_ref(t_function_ref('error_saving_audit'), 'error');
            }
            return;
        }

        const current_audit_data = getState_callback();
        if (!current_audit_data) {
            show_notification_function_ref(t_function_ref('no_audit_data_to_save'), 'error');
            return;
        }
        // save_audit_function_ref (som är SaveAuditLogic.save_audit_to_json_file)
        // behöver nu också få t_function och show_notification_function inskickade,
        // om de inte längre hämtar dem globalt.
        // Vi antar att SaveAuditLogic.js kommer att uppdateras för att ta emot dessa.
        save_audit_function_ref(current_audit_data, t_function_ref, show_notification_function_ref);
    }

    function render() {
        // Använd lokala referenser till hjälpfunktionerna
        if (!container_ref || !local_create_element_ref || !t_function_ref) {
            console.error("[SaveAuditButtonComponent] Container or core render dependencies missing.");
            return;
        }
        container_ref.innerHTML = ''; // Rensa container

        const icon_svg = local_get_icon_svg_ref ? local_get_icon_svg_ref('save', ['currentColor'], 18) : '';
        button_element = local_create_element_ref('button', {
            class_name: ['button', 'button-default'],
            html_content: `<span>${t_function_ref('save_audit_to_file')}</span>` + icon_svg
        });
        button_element.addEventListener('click', handle_save_click);
        container_ref.appendChild(button_element);
    }

    function destroy() {
        if (button_element) {
            button_element.removeEventListener('click', handle_save_click);
            button_element = null;
        }
        container_ref = null;
        getState_callback = null;
        save_audit_function_ref = null;
        t_function_ref = null;
        show_notification_function_ref = null;
        local_create_element_ref = null;
        local_get_icon_svg_ref = null;
        local_load_css_ref = null;
    }

    return {
        init,
        render,
        destroy
    };
})();