/*
    New Mail Indicator extension (for GNOME 45+)
    Copyright 2023 Francois Thirioux
    GitHub contributors: @fthx
    License: GPL v3
*/

import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

// new mail indicator color (default Yaru orange: #E95420; GNOME blue: #3584E4)
var NEW_MAIL_ICON_COLOR = '#E95420';


var MailIndicator = GObject.registerClass(
class MailIndicator extends PanelMenu.Button {
    _init() {
        super._init();

        this._find_default_client();

        this._button = new St.Bin({visible: true, reactive: true, can_focus: true, track_hover: true});
        this._icon = new St.Icon({icon_name: 'mail-read-symbolic', style_class: 'system-status-icon'});
        this._new_mail = false;
        this._button.set_child(this._icon);

        if (this._app) {
            this._source_added = Main.messageTray.connect('source-added', this._on_source_added.bind(this));
            this._source_removed = Main.messageTray.connect('source-removed', this._on_source_removed.bind(this));
            this._button_pressed = this._button.connect('button-release-event', this._toggle_default_mail_app.bind(this));
        }

        this.add_child(this._button);
    }

    _find_default_client() {
        this._decoder = new TextDecoder();
        this._app_query = GLib.spawn_command_line_sync("xdg-mime query default x-scheme-handler/mailto");
        this._app_filename = this._decoder.decode(this._app_query[1].slice(0,-1));
        this._app = Shell.AppSystem.get_default().lookup_app(this._app_filename);
        if (this._app) {
            this._app_name = this._app.get_name();
        } else {
            Main.notify("New Mail Indicator: error, no email client found");
        }
    }

    _icon_new_mail() {
        this._new_mail = true;
        this._icon.icon_name = 'mail-unread-symbolic';
        this._button.set_style('color: ' + NEW_MAIL_ICON_COLOR + ';');
    }

    _icon_no_new_mail() {
        this._new_mail = false;
        this._icon.icon_name = 'mail-read-symbolic';
        this._button.set_style('color: ;');
    }

    _on_source_added(tray, source) {
        if (source && source.title && source.title == this._app_name) {
            this._icon_new_mail();
        }
    }

    _on_source_removed(tray, source) {
        if (source && source.title && source.title == this._app_name) {
            this._icon_no_new_mail();
        }
    }

    _toggle_default_mail_app() {
        this._app_window = this._app.get_windows()[0];
        if (this._app_window) {
            if (this._app_window.has_focus() && !this._new_mail) {
                this._app_window.minimize();
            } else {
                this._app_window.unminimize();
                this._icon_no_new_mail();
                this._app_window.activate(global.get_current_time());
            }
        } else {
            this._app.activate();
        }
    }

    _destroy() {
        if (this._source_added) {
            Main.messageTray.disconnect(this._source_added);
        }
        this._source_added = null;

        if (this._source_removed) {
            Main.messageTray.disconnect(this._source_removed);
        }
        this._source_removed = null;

        if (this._button_pressed) {
            this.button.disconnect(this._button_pressed);
        }
        this._button_pressed = null;

        this._button.destroy();
        super.destroy();
    }
});

export default class NewMailIndicatorExtension {
    enable() {
        this._mail_indicator = new MailIndicator();
        Main.panel.addToStatusArea('new-mail-indicator', this._mail_indicator, -1, 'center');
    }

    disable() {
        this._mail_indicator._destroy();
    }
}
