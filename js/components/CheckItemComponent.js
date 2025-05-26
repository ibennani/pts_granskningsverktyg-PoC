// js/components/CheckItemComponent.js
export const CheckItemComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/check_item_component.css'; // Sökväg till den nya CSS-filen
    let css_loaded = false;

    let local_check_definition;
    let local_check_result_data; // Innehåller { status, overallStatus, passCriteria: {pcId: status} }
    let local_is_audit_locked;
    let local_parent_container;

    let t;
    let Helpers_create_element;
    let Helpers_get_icon_svg;
    // Helpers_escape_html behövs inte direkt här om all text kommer via t() som bör hantera det,
    // eller om textContent används istället för innerHTML för dynamisk text.

    async function load_styles_if_needed() {
        if (!css_loaded && window.Helpers && typeof window.Helpers.load_css === 'function') {
            if (!document.querySelector(`link[href="${CSS_PATH}"]`)) {
                try {
                    await window.Helpers.load_css(CSS_PATH);
                    css_loaded = true;
                } catch (error) {
                    console.warn("CheckItemComponent: Failed to load CSS:", error);
                }
            } else {
                css_loaded = true;
            }
        } else if (!css_loaded) {
            // console.warn("CheckItemComponent: Helpers.load_css not available or CSS already loaded state unknown.");
        }
    }

    function assign_dependencies() {
        if (!t && window.Translation && typeof window.Translation.t === 'function') {
            t = window.Translation.t;
        } else if (!t) {
            t = (key, rep) => (rep && rep.defaultValue ? rep.defaultValue : `**${key}** (CheckItem t not found)`);
        }

        if (!Helpers_create_element && window.Helpers) {
            Helpers_create_element = window.Helpers.create_element;
            Helpers_get_icon_svg = window.Helpers.get_icon_svg;
        } else if (!Helpers_create_element) {
            console.error("CheckItemComponent: Helpers_create_element is missing!");
            Helpers_create_element = (tag, opts) => {
                const el = document.createElement(tag);
                if(opts && opts.text_content) el.textContent = opts.text_content;
                if(opts && opts.class_name) el.className = Array.isArray(opts.class_name) ? opts.class_name.join(' ') : opts.class_name;
                if(opts && opts.attributes) {
                    for (const attr in opts.attributes) el.setAttribute(attr, opts.attributes[attr]);
                }
                return el;
            };
            Helpers_get_icon_svg = () => '';
        }
    }

    function handle_internal_status_click(event) {
        if (local_is_audit_locked) return;

        const target_button = event.target.closest('button[data-action]');
        if (!target_button) return;

        const action = target_button.dataset.action;
        let event_to_dispatch_name = null;
        let event_detail = {
            checkId: local_check_definition.id,
            currentOverallStatus: local_check_result_data.overallStatus,
            currentPassCriteriaStatuses: { ...(local_check_result_data.passCriteria || {}) }
        };

        if (action === 'set-check-complies') {
            event_to_dispatch_name = 'checkOverallStatusChange';
            event_detail.newOverallStatus = 'passed';
        } else if (action === 'set-check-not-complies') {
            event_to_dispatch_name = 'checkOverallStatusChange';
            event_detail.newOverallStatus = 'failed';
        } else {
            const pc_item_element = target_button.closest('.pass-criterion-item[data-pc-id]');
            if (pc_item_element) {
                const pc_id = pc_item_element.dataset.pcId;
                event_detail.passCriterionId = pc_id;
                event_detail.currentPassCriterionStatus = (local_check_result_data.passCriteria || {})[pc_id] || 'not_audited';

                if (action === 'set-pc-passed') {
                    event_to_dispatch_name = 'passCriterionStatusChange';
                    event_detail.newPcStatus = 'passed';
                } else if (action === 'set-pc-failed') {
                    event_to_dispatch_name = 'passCriterionStatusChange';
                    event_detail.newPcStatus = 'failed';
                }
            }
        }

        if (event_to_dispatch_name) {
            local_parent_container.dispatchEvent(new CustomEvent(event_to_dispatch_name, {
                detail: event_detail,
                bubbles: true,
                composed: true
            }));
        }
    }

    function render() {
        assign_dependencies();
        if (!local_parent_container || !local_check_definition || !local_check_result_data) {
            console.error("CheckItemComponent: Cannot render, essential data missing.");
            if (local_parent_container) local_parent_container.innerHTML = `<p>${t('error_render_component', {componentName: 'CheckItem'})}</p>`;
            return;
        }
        local_parent_container.innerHTML = '';

        const check_wrapper = Helpers_create_element('div', {
            class_name: 'check-item',
            attributes: { 'data-check-id': local_check_definition.id }
        });

        check_wrapper.appendChild(Helpers_create_element('h3', {
            class_name: 'check-condition-title',
            text_content: local_check_definition.condition
        }));

        const overall_manual_status_for_check = local_check_result_data.overallStatus || 'not_audited';

        if (!local_is_audit_locked) {
            const condition_actions_div = Helpers_create_element('div', { class_name: 'condition-actions' });
            const complies_button = Helpers_create_element('button', {
                class_name: ['button', 'button-success', 'button-small', overall_manual_status_for_check === 'passed' ? 'active' : ''],
                attributes: {
                    'aria-pressed': overall_manual_status_for_check === 'passed' ? 'true' : 'false',
                    'data-action': 'set-check-complies'
                },
                html_content: `<span>${t('check_complies')}</span>` + (Helpers_get_icon_svg('check_circle', ['currentColor'], 16))
            });
            condition_actions_div.appendChild(complies_button);

            const not_complies_button = Helpers_create_element('button', {
                class_name: ['button', 'button-danger', 'button-small', overall_manual_status_for_check === 'failed' ? 'active' : ''],
                attributes: {
                    'aria-pressed': overall_manual_status_for_check === 'failed' ? 'true' : 'false',
                    'data-action': 'set-check-not-complies'
                },
                html_content: `<span>${t('check_does_not_comply')}</span>` + (Helpers_get_icon_svg('cancel', ['currentColor'], 16))
            });
            condition_actions_div.appendChild(not_complies_button);
            check_wrapper.appendChild(condition_actions_div);
        }

        const calculated_check_status_for_display = local_check_result_data.status || 'not_audited';
        const check_status_text = t(`audit_status_${calculated_check_status_for_display}`, { defaultValue: calculated_check_status_for_display });
        check_wrapper.appendChild(Helpers_create_element('p', {
            class_name: 'check-status-display',
            html_content: `<strong>${t('check_status')}:</strong> <span class="status-text status-${calculated_check_status_for_display}">${check_status_text}</span>`
        }));

        if (overall_manual_status_for_check === 'passed' && local_check_definition.passCriteria && local_check_definition.passCriteria.length > 0) {
            const pc_list = Helpers_create_element('ul', { class_name: 'pass-criteria-list' });
            local_check_definition.passCriteria.forEach(pc_def => {
                const pc_item_li = Helpers_create_element('li', {
                    class_name: 'pass-criterion-item',
                    attributes: { 'data-pc-id': pc_def.id }
                });
                pc_item_li.appendChild(Helpers_create_element('p', {
                    class_name: 'pass-criterion-requirement',
                    text_content: pc_def.requirement
                }));

                const current_pc_status = (local_check_result_data.passCriteria || {})[pc_def.id] || 'not_audited';
                const pc_status_text = t(`audit_status_${current_pc_status}`, { defaultValue: current_pc_status });
                pc_item_li.appendChild(Helpers_create_element('div', {
                    class_name: 'pass-criterion-status',
                    html_content: `<strong>${t('status')}:</strong> <span class="status-text status-${current_pc_status}">${pc_status_text}</span>`
                }));

                if (!local_is_audit_locked) {
                    const pc_actions_div = Helpers_create_element('div', { class_name: 'pass-criterion-actions' });
                    const passed_button = Helpers_create_element('button', {
                        class_name: ['button', 'button-success', 'button-small', current_pc_status === 'passed' ? 'active' : ''],
                        attributes: {
                            'data-action': 'set-pc-passed',
                            'aria-pressed': current_pc_status === 'passed' ? 'true' : 'false'
                         },
                        html_content: `<span>${t('pass_criterion_approved')}</span>` + (Helpers_get_icon_svg('thumb_up', ['currentColor'], 16))
                    });
                    pc_actions_div.appendChild(passed_button);

                    const failed_button = Helpers_create_element('button', {
                        class_name: ['button', 'button-danger', 'button-small', current_pc_status === 'failed' ? 'active' : ''],
                        attributes: {
                            'data-action': 'set-pc-failed',
                            'aria-pressed': current_pc_status === 'failed' ? 'true' : 'false'
                        },
                        html_content: `<span>${t('pass_criterion_failed')}</span>` + (Helpers_get_icon_svg('thumb_down', ['currentColor'], 16))
                    });
                    pc_actions_div.appendChild(failed_button);
                    pc_item_li.appendChild(pc_actions_div);
                }
                pc_list.appendChild(pc_item_li);
            });
            check_wrapper.appendChild(pc_list);
        } else if (overall_manual_status_for_check === 'failed') {
            check_wrapper.appendChild(Helpers_create_element('p', {
                class_name: 'text-muted',
                style: 'font-size: 0.9em; margin-top: 0.5rem; font-style: italic;',
                text_content: t('check_marked_as_not_compliant_criteria_passed')
            }));
        }

        local_parent_container.appendChild(check_wrapper);

        // Lägg till event listener på den just renderade check_wrapper
        // för att hantera klick internt inom denna komponentinstans.
        // Vi tar bort den om den redan finns, ifall render() anropas flera gånger på samma container.
        if (check_wrapper.event_listener_attached_for_checkitem) {
            check_wrapper.removeEventListener('click', handle_internal_status_click);
        }
        check_wrapper.addEventListener('click', handle_internal_status_click);
        check_wrapper.event_listener_attached_for_checkitem = true; // Markera att vi lagt till den
    }

    async function init(_container_element, _check_def, _check_res_data, _is_locked) {
        local_parent_container = _container_element;
        local_check_definition = _check_def;
        local_check_result_data = _check_res_data;
        local_is_audit_locked = _is_locked;

        await load_styles_if_needed();
        assign_dependencies();
    }

    function destroy() {
        if (local_parent_container) {
            // Försök ta bort event listeners från .check-item element som kan finnas
            const check_items_in_container = local_parent_container.querySelectorAll('.check-item');
            check_items_in_container.forEach(item => {
                if (item.event_listener_attached_for_checkitem) {
                    item.removeEventListener('click', handle_internal_status_click);
                    delete item.event_listener_attached_for_checkitem;
                }
            });
            local_parent_container.innerHTML = '';
        }
        local_parent_container = null;
        local_check_definition = null;
        local_check_result_data = null;
        local_is_audit_locked = null;
    }

    return { init, render, destroy };
})();