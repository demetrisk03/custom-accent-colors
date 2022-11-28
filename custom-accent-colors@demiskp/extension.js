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
        let _accentColor = this._settings.get_string('accent-color');
        let _str;


        this._handlerAccentColor = this._settings.connect('changed::accent-color', () => {
            _accentColor = this._settings.get_string('accent-color');
            update_gtk4_theming(_accentColor);
            if (this._settings.get_boolean('theme-gtk3') == true) {
                update_gtk3_theming(
                    this._settings.get_boolean('theme-gtk3'), _accentColor);
            }
            if (this._settings.get_boolean('theme-shell') == true) {
                update_shell_theming(
                    this._settings.get_boolean('theme-shell'), _accentColor);
            }
        });

        this._handlerFlatpak = this._settings.connect('changed::theme-flatpak', () => {
            update_flatpak_theming(this._settings.get_boolean('theme-flatpak'));
        });

        this._handlerGTK3 = this._settings.connect('changed::theme-gtk3', () => {
            if (this._settings.get_boolean('theme-gtk3') == true) {
                backup_user_config('gtk-3.0', _accentColor);
            }
            update_gtk3_theming(
                this._settings.get_boolean('theme-gtk3'), _accentColor);
        });

        this._handlerShell = this._settings.connect('changed::theme-shell', () => {
            if (this._settings.get_boolean('theme-shell') == true) {
                create_file_dir(HomeDir +
                    '/.local/share/themes/CustomAccentColors/gnome-shell');
            }
            update_shell_theming(
                this._settings.get_boolean('theme-shell'), _accentColor);
        });


        backup_user_config('gtk-4.0', _accentColor);
        update_gtk4_theming(_accentColor);
        if (this._settings.get_boolean('theme-flatpak') == true) {
            update_flatpak_theming(this._settings.get_boolean('theme-flatpak'));
        }
        if (this._settings.get_boolean('theme-gtk3') == true) {
            backup_user_config('gtk-3.0', _accentColor);
            update_gtk3_theming(
                this._settings.get_boolean('theme-gtk3'), _accentColor);
        }
        if (this._settings.get_boolean('theme-shell') == true) {
            update_shell_theming(
                this._settings.get_boolean('theme-shell'), _accentColor);
        }
    }

    disable() {
        let _str;
        try {
            _str = read_file(HomeDir +
                '/.config/gtk-4.0/gtk.pre-custom-accent-colors.css');
            write_file(_str, HomeDir +
                '/.config/gtk-4.0/gtk.css');
            delete_file_dir(HomeDir +
                '/.config/gtk-4.0/gtk.pre-custom-accent-colors.css');
        } catch (e) {
            delete_file_dir(HomeDir + '/.config/gtk-4.0/gtk.css');
        }
        if (this._settings.get_boolean('theme-flatpak') == true) {
            try {
                GLib.spawn_command_line_async(
                    'flatpak override --user --nofilesystem=xdg-config/gtk-3.0 --user --nofilesystem=xdg-config/gtk-4.0');
            } catch (e) {
                logError(e);
            }
        }
        if (this._settings.get_boolean('theme-gtk3') == true) {
            try {
                _str = read_file(HomeDir +
                    '/.config/gtk-3.0/gtk.pre-custom-accent-colors.css');
                write_file(_str, HomeDir +
                    '/.config/gtk-3.0/gtk.css');
                delete_file_dir(HomeDir +
                    '/.config/gtk-3.0/gtk.pre-custom-accent-colors.css');
            } catch (e) {
                delete_file_dir(HomeDir + '/.config/gtk-3.0/gtk.css');
            }
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
        log(e);
    }
}

function read_file(path) {
    const file = Gio.File.new_for_path(path);
    const [, contents, etag] = file.load_contents(null);
    const decoder = new TextDecoder('utf-8');
    const contentsString = decoder.decode(contents);

    return contentsString;
}

function write_file(str, path) {
    const file = Gio.File.new_for_path(path);
    const [, etag] = file.replace_contents(
        str, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
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
        log(e);
    }
}

function backup_user_config(dir, accentcolor) {
    try {
        const str = read_file(HomeDir + '/.config/' + dir + '/gtk.css');
        if (str != read_file(MeDir + '/resources/' + accentcolor + '/gtk.css')) {
            write_file(str, HomeDir +
                '/.config/' + dir + '/gtk.pre-custom-accent-colors.css');
        }
    } catch (e) {
        return;
    }
}

function update_gtk4_theming(accentcolor) {
    const theme = read_file(MeDir + '/resources/' + accentcolor + '/gtk.css');
    write_file(theme, HomeDir + '/.config/gtk-4.0/gtk.css');
}


function update_flatpak_theming(themeit) {
    if (themeit == true) {
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

function update_gtk3_theming(themeit, accentcolor) {
    if (themeit == true) {
        const theme = read_file(MeDir + '/resources/' + accentcolor + '/gtk.css');
        write_file(theme, HomeDir + '/.config/gtk-3.0/gtk.css');
    } else {
        try {
            const str = read_file(HomeDir +
                '/.config/gtk-3.0/gtk.pre-custom-accent-colors.css');
            write_file(str, HomeDir + '/.config/gtk-3.0/gtk.css');
            delete_file_dir(HomeDir +
                '/.config/gtk-3.0/gtk.pre-custom-accent-colors.css');
        } catch (e) {
            delete_file_dir(HomeDir + '/.config/gtk-3.0/gtk.css');
        }
    }  
}

function update_shell_theming(themeit, accentcolor) {
    if (themeit == true) {
        let theme = read_file(MeDir +
            '/resources/' + accentcolor + '/gnome-shell/gnome-shell.css');
        write_file(theme, HomeDir +
            '/.local/share/themes/CustomAccentColors/gnome-shell/gnome-shell.css');
        theme = read_file(MeDir +
            '/resources/' + accentcolor + '/gnome-shell/toggle-on.svg');
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