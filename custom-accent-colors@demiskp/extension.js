/* extension.js
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
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const { Gio, GLib } = imports.gi;

const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();
const MeDir = Me.dir.get_path();
const HomeDir = GLib.get_home_dir();

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
    }

    enable() {
        this._settings = ExtensionUtils.getSettings(
            'org.gnome.shell.extensions.custom-accent-colors');
        this._accentColor = this._settings.get_string('accent-color');

        this._handlerAccentColor = this._settings.connect('changed::accent-color', () => {
            this._accentColor = this._settings.get_string('accent-color');
            update_gtk_theming('gtk-4.0', true, this._accentColor);
            if (this._settings.get_boolean('theme-gtk3') == true) {
                update_gtk_theming('gtk-3.0', true, this._accentColor);
            }
            if (this._settings.get_boolean('theme-shell') == true) {
                update_shell_theming(true, this._accentColor);
            }
        });

        this._handlerFlatpak = this._settings.connect('changed::theme-flatpak', () => {
            update_flatpak_theming(this._settings.get_boolean('theme-flatpak'));
        });

        this._handlerGTK3 = this._settings.connect('changed::theme-gtk3', () => {
            if (this._settings.get_boolean('theme-gtk3') == true) {
                backup_user_config('gtk-3.0', this._accentColor);
            }
            update_gtk_theming(
                'gtk-3.0', this._settings.get_boolean('theme-gtk3'), this._accentColor);
        });

        this._handlerShell = this._settings.connect('changed::theme-shell', () => {
            update_shell_theming(
                this._settings.get_boolean('theme-shell'), this._accentColor);
        });

        backup_user_config('gtk-4.0', this._accentColor);
        update_gtk_theming('gtk-4.0', true, this._accentColor);
        if (this._settings.get_boolean('theme-flatpak') == true) {
            update_flatpak_theming(true);
        }
        if (this._settings.get_boolean('theme-gtk3') == true) {
            backup_user_config('gtk-3.0', this._accentColor);
            update_gtk_theming('gtk-3.0', true, this._accentColor);
        }
        if (this._settings.get_boolean('theme-shell') == true) {
            update_shell_theming(true, this._accentColor);
        }
    }

    disable() {
        update_gtk_theming('gtk-4.0', false, this._accentColor);
        if (this._settings.get_boolean('theme-flatpak') == true) {
            update_flatpak_theming(false);
        }
        if (this._settings.get_boolean('theme-gtk3') == true) {
            update_gtk_theming('gtk-3.0', false, this._accentColor);
        }

        if (this._handlerAccentColor) {
            this._settings.disconnect(this._handlerAccentColor);
            this._handlerAccentColor = null;
        }
        if (this._handlerFlatpak) {
            this._settings.disconnect(this._handlerFlatpak);
            this._handlerFlatpak = null;
        }
        if (this._handlerGTK3) {
            this._settings.disconnect(this._handlerGTK3);
            this._handlerGTK3 = null;
        }
        if (this._handlerShell) {
            this._settings.disconnect(this._handlerShell);
            this._handlerShell = null;
        }
        this._settings = null;
    }
}

function init() {
    return new Extension();
}

function create_file_dir(path) {
    const file = Gio.File.new_for_path(path);
    try {
        file.make_directory_with_parents(null);
    } catch (e) {
        return;
    }
}

function read_file(path) {
    try {
        const file = Gio.File.new_for_path(path);
        const [, contents, etag] = file.load_contents(null);
        const decoder = new TextDecoder('utf-8');
        const contentsString = decoder.decode(contents);
        return contentsString;
    } catch (e) {
        return null;
    }
}

function write_file(str, path) {
    try {
        const file = Gio.File.new_for_path(path);
        const [, etag] = file.replace_contents(
            str, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
    } catch (e) {
        return;
    }
}

async function delete_file_dir(path) {
    const file = Gio.File.new_for_path(path);
    try {
        await new Promise((resolve, reject) => {
            file.delete_async(
                GLib.PRIORITY_DEFAULT,
                null,
                (file_, result) => {
                    try {
                        resolve(file.delete_finish(result));
                    } catch (e) {
                        reject(e);
                    }
                }
            );
        });
    } catch (e) {
        return;
    }
}

function backup_user_config(gtkDir, accentColor) {
    let str = read_file(HomeDir + '/.config/' + gtkDir + '/gtk.css');
    if (str != null && str != read_file(MeDir + '/resources/' + accentColor + '/gtk.css')) {
        write_file(str, HomeDir +
            '/.config/' + gtkDir + '/gtk.pre-custom-accent-colors.css');
    }
}

function update_gtk_theming(gtkDir, themeIt, accentColor) {
    if (themeIt == true) {
        create_file_dir(HomeDir + '/.config/' + gtkDir);
        let theme = read_file(MeDir + '/resources/' + accentColor + '/gtk.css');
        write_file(theme, HomeDir + '/.config/' + gtkDir + '/gtk.css');
    } else {
        let str = read_file(HomeDir +
            '/.config/' + gtkDir + '/gtk.pre-custom-accent-colors.css');
        if (str != null) {
            write_file(str, HomeDir +
                '/.config/' + gtkDir + '/gtk.css');
            delete_file_dir(HomeDir +
                '/.config/' + gtkDir + '/gtk.pre-custom-accent-colors.css');
        } else {
            delete_file_dir(HomeDir + '/.config/' + gtkDir + '/gtk.css');
        }
    }  
}

function update_flatpak_theming(themeIt) {
    if (themeIt == true) {
        try {
            GLib.spawn_command_line_async(
                'flatpak override --user --filesystem=xdg-config/gtk-3.0:ro --user --filesystem=xdg-config/gtk-4.0:ro');
        } catch (e) {
            logError(e);
        }
    } else {
          try {
            GLib.spawn_command_line_async(
                'flatpak override --user --nofilesystem=xdg-config/gtk-3.0 --user --nofilesystem=xdg-config/gtk-4.0');
        } catch (e) {
            logError(e);
        }
    }     
}

function update_shell_theming(themeIt, accentColor) {
    if (themeIt == true) {
        create_file_dir(HomeDir +
            '/.local/share/themes/CustomAccentColors/gnome-shell');
        let theme = read_file(MeDir +
            '/resources/' + accentColor + '/gnome-shell/gnome-shell.css');
        write_file(theme, HomeDir +
            '/.local/share/themes/CustomAccentColors/gnome-shell/gnome-shell.css');
        theme = read_file(MeDir +
            '/resources/' + accentColor + '/gnome-shell/toggle-on.svg');
        write_file(theme, HomeDir +
            '/.local/share/themes/CustomAccentColors/gnome-shell/toggle-on.svg');
    } else {
        delete_file_dir(HomeDir +
            '/.local/share/themes/CustomAccentColors/gnome-shell/gnome-shell.css');
        delete_file_dir(HomeDir +
            '/.local/share/themes/CustomAccentColors/gnome-shell/toggle-on.svg');
        delete_file_dir(HomeDir +
            '/.local/share/themes/CustomAccentColors/gnome-shell');
        delete_file_dir(HomeDir + '/.local/share/themes/CustomAccentColors');
    }
}