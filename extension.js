
/*
 * New Mail Indicator extension for Gnome 3.x
 * Copyright 2020 fthx
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */


const St = imports.gi.St;
const Main = imports.ui.main;
const Lang = imports.lang;
const Util = imports.misc.util;
const GLib = imports.gi.GLib;
const centerBox = Main.panel._centerBox;
const ByteArray = imports.byteArray;

const NEW_MAIL_ICON_COLOR = '#E95420';

// get the default mail client's app.desktop filename (and remove the blank space at last position...)
let defaultMailAppFilename = ByteArray.toString(GLib.spawn_command_line_sync("xdg-mime query default x-scheme-handler/mailto")[1]).slice(0,-1);
// get the default mail client's executable command
let defaultMailAppExe;
let defaultMailAppName;
let defaultMailAppExeAlt;
switch (defaultMailAppFilename) {
  case "thunderbird.desktop":
  case "mozilla-thunderbird.desktop":
    defaultMailAppExe = "thunderbird";
    defaultMailAppName = "Thunderbird";
    break;
  case "org.gnome.Evolution.desktop":
    defaultMailAppExe = "evolution -c mail";
    defaultMailAppName = "Evolution";
    break;
  case "org.gnome.Geary.desktop":
    defaultMailAppExe = "geary";
    defaultMailAppExeAlt = "flatpak run org.gnome.Geary";
    defaultMailAppName = "Geary";
    break;
  case "mailspring_mailspring.desktop":
  	defaultMailAppExe = "mailspring";
  	defaultMailAppName = "Mailspring";
  	break;
  default:
    // if nothing is found
    Main.notify("New Mail Indicator: error, no known email client found.");
};
// for debug purposes you can uncomment the next line: it will pop-up the default mail client above names
//Main.notify(defaultMailAppFilename+"  "+defaultMailAppExe+"  "+defaultMailAppName);

const MailIndicator = new Lang.Class({
    Name: 'MailIndicator',

    _init: function() {   	
        this.actor = new St.Bin({style_class: 'panel-button', visible: true, 
        	reactive: true, can_focus: true, track_hover: true});        
        this.icon = new St.Icon({icon_name: 'mail-read-symbolic', style_class: 'system-status-icon'});
        this.actor.set_child(this.icon);

        Main.messageTray.connect('source-added', Lang.bind(this, this._onSourceAdded));
        Main.messageTray.connect('source-removed', Lang.bind(this, this._onSourceRemoved));        
        this.actor.connect('button-press-event', this._startDefaultMailApp);      
    },

    _onSourceAdded: function(tray, source) {
        if (source.title.includes(defaultMailAppName)) {
        	this.mail_icon = 'mail-unread-symbolic';
        	this.icon.icon_name = this.mail_icon;
        	this.actor.style = 'color: ' + NEW_MAIL_ICON_COLOR + ';';
        }
    },

    _onSourceRemoved: function(tray, source) {
        if (source.title.includes(defaultMailAppName)) {
        	this.mail_icon = 'mail-read-symbolic';
        	this.icon.icon_name = this.mail_icon;
        	this.actor.style = 'color: ;';
        }
    },
    
    _startDefaultMailApp: function() {
    	try {Util.spawnCommandLine(defaultMailAppExe);}
    	catch(error) {Util.spawnCommandLine(defaultMailAppExeAlt);}
    },
    	
    _destroy: function() {
    	Main.messageTray.disconnect(this._onSourceAdded);
        Main.messageTray.disconnect(this._onSourceRemoved);
		this.actor.destroy();
	}
	
});

let mail_indicator;

function init() {
}

function enable() {
    mail_indicator = new MailIndicator();
    centerBox.add_actor(mail_indicator.actor);
}

function disable() {
	centerBox.remove_actor(mail_indicator.actor);
	mail_indicator._destroy();
}
