/*
	New Mail Indicator extension (for Gnome 3.36+)
	Copyright 2020 Francois Thirioux
	GitHub contributors: @fthx
	License: GPL v3
*/

const { GLib, GObject, Shell, St } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const Lang = imports.lang;
const Util = imports.misc.util;
const ByteArray = imports.byteArray;

// new mail indicator color (default Yaru orange: #E95420; GNOME blue: #3584E4)
const NEW_MAIL_ICON_COLOR = '#E95420';


var MailIndicator = GObject.registerClass(
class MailIndicator extends PanelMenu.Button {
    _init() {
    	super._init(0.0, 'New Mail Indicator');
    	
    	this._find_default_client();
    	
    	// create indicator button
        this.button = new St.Bin({style_class: 'panel-button', visible: true, reactive: true, can_focus: true, track_hover: true});        
        this.icon = new St.Icon({icon_name: 'mail-read-symbolic', style_class: 'system-status-icon'});
        this.button.set_child(this.icon);

		// connect signals: new notification, notification removed, button pressed
        this.source_added = Main.messageTray.connect('source-added', Lang.bind(this, this._on_source_added));
        this.source_removed = Main.messageTray.connect('source-removed', Lang.bind(this, this._on_source_removed));        
        this.button_pressed = this.button.connect('button-press-event', Lang.bind(this, this._toggle_default_mail_app));
        
        // add button
        this.add_child(this.button);  
    }
    
    // get the default email client filename, name, executable and app
    _find_default_client() {
    	this.default_mail_app_filename = ByteArray.toString(GLib.spawn_command_line_sync("xdg-mime query default x-scheme-handler/mailto")[1]).slice(0,-1);
		switch (this.default_mail_app_filename) {
			case "thunderbird.desktop":
			case "mozilla-thunderbird.desktop":
			case "thunderbird_thunderbird.desktop": // snap
				this.default_mail_app_exe = "thunderbird";
				this.default_mail_app_name = "Thunderbird";
			break;
			case "org.gnome.Evolution.desktop":
				this.default_mail_app_exe = "evolution -c mail";
				this.default_mail_app_name = "Evolution";
			break;
			case "org.gnome.Geary.desktop":
				this.default_mail_app_exe = "geary";
				this.default_mail_app_exe_alt = "flatpak run org.gnome.Geary"; // flatpak alternative
				this.default_mail_app_name = "Geary";
			break;
			case "mailspring_mailspring.desktop":
			  	this.default_mail_app_exe = "mailspring";
			  	this.default_mail_app_name = "Mailspring";
		  	break;
			default:
				Main.notify("New Mail Indicator: error, no known email client found.");
		};
		
		// get the app object from filename
		this.app = Shell.AppSystem.get_default().lookup_app(this.default_mail_app_filename);
		// for debug purposes you can uncomment the next line: it will pop-up the default mail client above names
		//Main.notify(defaultMailAppFilename+"  "+defaultMailAppExe+"  "+defaultMailAppName);
	}
	
	// color mail icon related notification
    _on_source_added(tray, source) {
        if (source.title.includes(this.default_mail_app_name)) {
        	this.icon.icon_name = 'mail-unread-symbolic';
        	this.button.style = 'color: ' + NEW_MAIL_ICON_COLOR + ';';
        }
    }

	// un-color mail icon if related source removed
    _on_source_removed(tray, source) {
        if (source.title.includes(this.default_mail_app_name)) {
        	this.icon.icon_name = 'mail-read-symbolic';
        	this.button.style = 'color: ;';
        }
    }
    
    // start default mail app or activate its window or minimize its window
    _toggle_default_mail_app() {
    	this.app_window = this.app.get_windows()[0];
    	if (this.app_window) {
			if (this.app_window.has_focus()) {
				this.app_window.minimize();
			} else {
				this.app_window.unminimize();
				this.app_window.activate(global.get_current_time());
			}
		} else {
			try {
				Util.spawnCommandLine(this.default_mail_app_exe);
			} catch(error) {
				Util.spawnCommandLine(this.default_mail_app_exe_alt);
			};
		};
		for (let source of Main.messageTray.getSources()) {
				if (source.title.includes(this.default_mail_app_name)) {
					Main.messageTray._removeSource(source);
				}
		}
    }
    
    _destroy() {
    	Main.messageTray.disconnect(this.source_added);
        Main.messageTray.disconnect(this.source_removed);        
        this.button.disconnect(this.button_pressed); 
        this.button.destroy();
        super.destroy();
	}
});

var mail_indicator;

function init() {
}

function enable() {
    mail_indicator = new MailIndicator();
    Main.panel.addToStatusArea('new-mail-indicator', mail_indicator, -1, 'center');
}

function disable() {
	mail_indicator._destroy();
}
