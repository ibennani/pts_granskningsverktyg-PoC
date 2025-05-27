// js/components/NotificationComponent.js

// KORRIGERAD SÖKVÄG till helpers.js
import { create_element, load_css } from '../utils/helpers.js';

// KORRIGERAD SÖKVÄG till translation_logic.js
import { t as imported_t_notification } from '../translation_logic.js';

const CSS_PATH = 'css/components/notification_component.css'; // Relativt till index.html
const GLOBAL_MESSAGE_CONTAINER_ID = 'global-message-area';

let global_message_element = null;
let css_loaded_for_notification = false;

async function load_nc_styles_if_needed() {
    if (!css_loaded_for_notification && typeof load_css === 'function') {
        if (!document.querySelector(`link[href="${CSS_PATH}"]`)) {
            try {
                await load_css(CSS_PATH);
                css_loaded_for_notification = true;
            } catch (error) {
                console.error("NotificationComponentMod: Failed to load CSS:", error);
            }
        } else {
            css_loaded_for_notification = true;
        }
    } else if (!css_loaded_for_notification && typeof load_css !== 'function') {
        console.warn("NotificationComponentMod: load_css (importerad) not available.");
    }
}

export async function init_notification_module() {
    await load_nc_styles_if_needed();
    if (!global_message_element) {
        global_message_element = document.getElementById(GLOBAL_MESSAGE_CONTAINER_ID);
        if (!global_message_element && typeof create_element === 'function') {
            global_message_element = create_element('div', {
                id: GLOBAL_MESSAGE_CONTAINER_ID,
                attributes: { 'aria-live': 'polite', hidden: 'true' }
            });
        } else if (!global_message_element) {
            console.error("NotificationComponentMod init: create_element not available to create message container if not found.");
        }
    }
}

function _update_global_message_content_internal(message, type) {
    if (!global_message_element || typeof create_element !== 'function' || typeof imported_t_notification !== 'function') {
        console.error("NotificationComponentMod: Cannot update message, core dependencies missing or element not ready.");
        return;
    }
    global_message_element.innerHTML = '';

    if (message && message.trim() !== '') {
        global_message_element.textContent = message;
        global_message_element.className = '';
        global_message_element.classList.add('global-message-content');
        global_message_element.classList.add(`message-${type}`);

        if (type === 'error' || type === 'warning') {
            const close_button = create_element('button', {
                class_name: 'global-message-close-btn', html_content: '×',
                attributes: { 'aria-label': imported_t_notification('close'), title: imported_t_notification('close') }
            });
            close_button.addEventListener('click', clear_global_message, { once: true });
            global_message_element.appendChild(close_button);
            global_message_element.setAttribute('role', 'alert');
        } else {
            global_message_element.removeAttribute('role');
        }
        global_message_element.removeAttribute('hidden');
    } else {
        clear_global_message();
    }
}

export function show_global_message(message, type = 'info') {
    if (!global_message_element) {
        init_notification_module().then(() => {
             if(global_message_element) _update_global_message_content_internal(message, type);
             else console.error("NotificationComponentMod: Still cannot show message, container not established after init.");
        }).catch(err => {
            console.error("Error during init in show_global_message for NotificationComponent:", err);
        });
        return;
    }
    _update_global_message_content_internal(message, type);
}

export function clear_global_message() {
    if (global_message_element) {
        global_message_element.textContent = '';
        global_message_element.setAttribute('hidden', 'true');
        global_message_element.className = 'global-message-content';
        global_message_element.removeAttribute('role');
        const btn = global_message_element.querySelector('.global-message-close-btn');
        if(btn) btn.remove();
    }
}

export function get_global_message_element_reference() {
    if (!global_message_element) {
        if (typeof create_element === 'function' && !document.getElementById(GLOBAL_MESSAGE_CONTAINER_ID)) {
             global_message_element = create_element('div', {
                id: GLOBAL_MESSAGE_CONTAINER_ID,
                attributes: { 'aria-live': 'polite', hidden: 'true' }
            });
        } else if (!document.getElementById(GLOBAL_MESSAGE_CONTAINER_ID) && typeof create_element !== 'function') {
            // Fallback om create_element inte finns och elementet inte finns
            global_message_element = document.createElement('div');
            global_message_element.id = GLOBAL_MESSAGE_CONTAINER_ID;
            global_message_element.setAttribute('aria-live', 'polite');
            global_message_element.hidden = true;
        } else {
             global_message_element = document.getElementById(GLOBAL_MESSAGE_CONTAINER_ID);
        }
    }
    return global_message_element;
}

console.log("[NotificationComponent.js] ES6 Module loaded.");