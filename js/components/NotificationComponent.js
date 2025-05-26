// js/components/NotificationComponent.js

// NYTT: Importera create_element och load_css från helpers.js
// Vi antar att helpers.js ligger en nivå upp från components-mappen.
import { create_element, load_css } from '../../utils/helpers.js';

(function () { // IIFE start
    'use-strict';

    const CSS_PATH = 'css/components/notification_component.css';
    const GLOBAL_MESSAGE_CONTAINER_ID = 'global-message-area';

    let global_message_element = null;
    // Translation.t kommer fortfarande att hämtas från window inuti funktionerna vid behov,
    // eftersom denna komponent inte initieras av main.js på samma sätt som vyer
    // och därmed inte lätt kan få t() inskickad. Detta kan refaktoreras senare.

    async function init_notification_component() { // Omdöpt för att undvika global namnkonflikt
        // Använd importerad load_css
        if (typeof load_css === 'function') {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if(!link_tag) await load_css(CSS_PATH);
            } catch (error) {
                console.error("NotificationComponent: Failed to load CSS:", error);
            }
        } else {
            console.warn("NotificationComponent: load_css (importerad) not available for CSS loading.");
        }

        return Promise.resolve().then(() => {
            global_message_element = document.getElementById(GLOBAL_MESSAGE_CONTAINER_ID);
            // Använd importerad create_element
            if (!global_message_element && typeof create_element === 'function') {
                global_message_element = create_element('div', {
                    id: GLOBAL_MESSAGE_CONTAINER_ID,
                    attributes: { 'aria-live': 'polite', hidden: 'true' }
                });
                // Denna kommer att läggas till av vyn som använder den.
            } else if (!global_message_element) { // Fallback om create_element inte kunde importeras
                console.error("NotificationComponent: create_element (importerad) not available to create message container.");
                global_message_element = document.createElement('div'); // Mycket enkel fallback
                global_message_element.id = GLOBAL_MESSAGE_CONTAINER_ID;
                global_message_element.setAttribute('aria-live', 'polite');
                global_message_element.hidden = true;
            }
        });
    }

    function _update_global_message_content(message, type){
        if (!global_message_element || typeof create_element !== 'function') { // Kolla importerad create_element
            console.error("NotificationComponent: Cannot update message, core dependencies missing or element not ready.");
            return;
        }
        // Hämta t-funktionen från window här, då den inte skickas in.
        const t = (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
            ? window.Translation.t
            : (key, rep) => (rep && rep.defaultValue ? rep.defaultValue : `**${key}** (NC t not found)`);


        global_message_element.innerHTML = '';

        if (message && message.trim() !== '') {
            global_message_element.textContent = message;
            global_message_element.className = ''; // Rensa tidigare klasser
            global_message_element.classList.add('global-message-content'); // Behåll denna
            global_message_element.classList.add(`message-${type}`);

            if (type === 'error' || type === 'warning') {
                const close_button = create_element('button', { // Använd importerad
                    class_name: 'global-message-close-btn', html_content: '×',
                    attributes: { 'aria-label': t('close'), title: t('close') }
                });
                close_button.addEventListener('click', clear_global_message, { once: true });
                global_message_element.appendChild(close_button);
                global_message_element.setAttribute('role', 'alert');
            } else {
                global_message_element.removeAttribute('role');
            }
            global_message_element.removeAttribute('hidden');
        } else {
            clear_global_message(); // Detta anropar funktionen nedan
        }
    }

    function show_global_message(message, type = 'info') {
        if (!global_message_element) {
            init_notification_component().then(() => {
                if(global_message_element) _update_global_message_content(message, type);
                else console.error("NotificationComponent: Still cannot show message, container not established after re-init.");
            });
            return;
        }
        _update_global_message_content(message, type);
    }

    function clear_global_message() {
        if (global_message_element) {
            global_message_element.textContent = '';
            global_message_element.setAttribute('hidden', 'true');
            global_message_element.className = 'global-message-content'; // Återställ till basklass
            global_message_element.removeAttribute('role');
            const btn = global_message_element.querySelector('.global-message-close-btn');
            if(btn) btn.remove();
        }
    }

    function get_global_message_element_reference() {
        if (!global_message_element) {
            // Försök skapa om den inte finns (kan hända om en vy anropar detta innan main.js' init har kört fullt ut)
            if (typeof create_element === 'function' && !document.getElementById(GLOBAL_MESSAGE_CONTAINER_ID)) {
                 global_message_element = create_element('div', { // Använd importerad
                    id: GLOBAL_MESSAGE_CONTAINER_ID,
                    attributes: { 'aria-live': 'polite', hidden: 'true' }
                });
            } else if (!document.getElementById(GLOBAL_MESSAGE_CONTAINER_ID)) {
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

    const public_api = {
        init: init_notification_component, // Exponera den omdöpta init
        show_global_message,
        clear_global_message,
        get_global_message_element_reference
    };

    window.NotificationComponent = public_api;

    // console.log("[NotificationComponent.js] IIFE executed. typeof window.NotificationComponent:", typeof window.NotificationComponent);
    // if (typeof window.NotificationComponent === 'object' && window.NotificationComponent !== null) {
    //     console.log("[NotificationComponent.js] window.NotificationComponent keys:", Object.keys(window.NotificationComponent));
    // }
})();