// js/components/ProgressBarComponent.js

// NYTT: Importera create_element och load_css från helpers.js
import { create_element, load_css } from '../../utils/helpers.js'; // Justerad sökväg

(function () { // IIFE start
    'use-strict';

    const CSS_PATH = 'css/components/progress_bar_component.css';
    let css_loaded = false;

    async function load_styles_if_needed_internal() { // Omdöpt för att vara intern
        // Använd importerad load_css
        if (!css_loaded && typeof load_css === 'function') {
            if (!document.querySelector(`link[href="${CSS_PATH}"]`)) {
                try {
                    await load_css(CSS_PATH);
                    css_loaded = true;
                } catch (error) {
                    console.warn("Failed to load CSS for ProgressBarComponent:", error);
                }
            } else {
                css_loaded = true; // Already in DOM
            }
        } else if (!css_loaded) {
            console.warn("ProgressBarComponent: load_css (importerad) not available or CSS already loaded state unknown.");
        }
    }

    function create_progress_bar(current_value, max_value, options = {}) { // Omdöpt för att vara intern
        load_styles_if_needed_internal(); // Anropa den interna omdöpta funktionen

        // Använd importerad create_element
        if (typeof create_element !== 'function') {
            console.error("ProgressBarComponent: create_element (importerad) not available!");
            const fallback_progress = document.createElement('div'); // Enkel fallback
            fallback_progress.textContent = `Progress: ${current_value} / ${max_value}`;
            return fallback_progress;
        }

        const t = (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
            ? window.Translation.t
            : (key, rep) => (rep && rep.defaultValue ? rep.defaultValue : `**${key}** (PB t not found)`);

        const progress_wrapper = create_element('div', { class_name: 'progress-bar-wrapper' });

        const progress_element_attributes = {
            value: String(current_value),
            max: String(max_value),
            'aria-label': options.label || t('progress_bar_label', { defaultValue: 'Progress' })
        };
        if (options.id) {
            progress_element_attributes.id = options.id;
        }
        progress_element_attributes['aria-valuemin'] = "0";
        progress_element_attributes['aria-valuemax'] = String(max_value);
        progress_element_attributes['aria-valuenow'] = String(current_value);

        const progress_element = create_element('progress', {
            class_name: 'progress-bar-element',
            attributes: progress_element_attributes
        });

        progress_wrapper.appendChild(progress_element);

        if (options.show_text || options.show_percentage) {
             let text_content_val = '';
             if (options.show_text) {
                 text_content_val = `${current_value} / ${max_value}`;
             } else if (options.show_percentage) {
                 const percentage = max_value > 0 ? Math.round((current_value / max_value) * 100) : 0;
                 text_content_val = `${percentage}%`;
             }
            const progress_text = create_element('span', {
                class_name: 'progress-bar-text',
                text_content: text_content_val
            });
            if (options.text_sr_only) { // Antag att 'visually-hidden' klassen finns globalt
                progress_text.classList.add('visually-hidden');
            }
            progress_wrapper.appendChild(progress_text);
        }

        return progress_wrapper;
    }

    const public_api = {
        create: create_progress_bar // Exponera den omdöpta interna funktionen som 'create'
    };

    if (typeof window.ProgressBarComponent === 'undefined') {
        window.ProgressBarComponent = public_api;
    } else {
        window.ProgressBarComponent = public_api;
    }

})(); // IIFE end