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

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';

const ShellVersion = parseInt(Config.PACKAGE_VERSION);

export default class CustomAccentColors extends Extension {
    enable() {
        this.settings = this.getSettings(
            'org.gnome.shell.extensions.custom-accent-colors'
        );

        this.settings.connect('changed::accent-color', () => {
            this.applyAccentColor(true);
        });
        this.settings.connect('changed::theme-flatpak', () => {
            this.updateFlatpakTheming(this.settings.get_boolean('theme-flatpak'));
        });
        this.settings.connect('changed::theme-gtk3', () => {
            this.updateGtkTheming('gtk-3.0', this.settings.get_boolean('theme-gtk3'));
        });
        this.settings.connect('changed::theme-shell', () => {
            this.updateShellTheming(this.settings.get_boolean('theme-shell'));
        });

        this.applyAccentColor(true);
    }

    disable() {
        this.applyAccentColor(false);

        this.settings = null;
    }

    createDir(path) {
        try {
            const file = Gio.File.new_for_path(path);
            file.make_directory_with_parents(null);
        } catch (e) {
            console.error(e);
        }
    }

    readFile(path) {
        try {
            const file = Gio.File.new_for_path(path);
            const [, contents, etag] = file.load_contents(null);
            const decoder = new TextDecoder('utf-8');
            const contentsString = decoder.decode(contents);
            return contentsString;
        } catch (e) {
            console.error(e);
        }
    }

    async writeFile(str, path) {
        try {
            const file = Gio.File.new_for_path(path);
            await new Promise((resolve, reject) => {
                file.replace_contents_bytes_async(
                    new GLib.Bytes(str),
                    null,
                    false,
                    Gio.FileCreateFlags.REPLACE_DESTINATION,
                    null,
                    (file_, result) => {
                        try {
                            resolve(file.replace_contents_finish(result));
                        } catch (e) {
                            reject(e);
                        }
                    }
                );
            });
        } catch (e) {
            console.error(e);
        }
    }

    async deleteFileDir(path) {
        try {
            const file = Gio.File.new_for_path(path);
            await new Promise((resolve, reject) => {
                file.delete_async(GLib.PRIORITY_DEFAULT, null, (file_, result) => {
                    try {
                        resolve(file.delete_finish(result));
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        } catch (e) {
            console.error(e);
        }
    }

    applyAccentColor(apply) {
        this.accentColor = this.settings.get_string('accent-color');

        this.updateGtkTheming('gtk-4.0', apply);
        if (this.settings.get_boolean('theme-flatpak')) {
            this.updateFlatpakTheming(apply);
        }
        if (this.settings.get_boolean('theme-gtk3')) {
            this.updateGtkTheming('gtk-3.0', apply);
        }
        if (apply && this.settings.get_boolean('theme-shell')) {
            this.updateShellTheming(true);
        }
    }

    updateGtkTheming(gtkVer, apply) {
        const meDir = this.path;
        const configDir = GLib.get_user_config_dir();
        const gtkFile = Gio.File.new_for_path(configDir + '/' + gtkVer + '/gtk.css');
        if (apply && this.accentColor != 'default') {
            const gtkDir = Gio.File.new_for_path(configDir + '/' + gtkVer);
            if (!gtkDir.query_exists(null)) {
                this.createDir(gtkDir.get_path());
            }
            const str = this.readFile(meDir + '/resources/' + this.accentColor + '/gtk.css');
            this.writeFile(str, gtkFile.get_path());
        } else if (gtkFile.query_exists(null)) {
            this.deleteFileDir(gtkFile.get_path());
        }
    }

    updateFlatpakTheming(apply) {
        if (apply && this.accentColor != 'default') {
            try {
                GLib.spawn_command_line_async(
                    'flatpak override --user --filesystem=xdg-config/gtk-4.0:ro --filesystem=xdg-config/gtk-3.0:ro'
                );
            } catch (e) {
                console.error(e);
            }
        } else {
            try {
                GLib.spawn_command_line_async(
                    'flatpak override --user --nofilesystem=xdg-config/gtk-4.0 --nofilesystem=xdg-config/gtk-3.0'
                );
            } catch (e) {
                console.error(e);
            }
        }
    }

    updateShellTheming(apply) {
        const meDir = this.path;
        const dataDir = GLib.get_user_data_dir();
        let shellThemeDir = Gio.File.new_for_path(
            dataDir + '/themes/Custom-Accent-Colors'
        );
        if (apply && this.accentColor != 'default') {
            if (!shellThemeDir.query_exists(null)) {
                this.createDir(shellThemeDir.get_path() + '/gnome-shell');
            }
            let str = this.readFile(
                meDir +
                '/resources/' +
                this.accentColor +
                '/gnome-shell/' +
                ShellVersion +
                '/gnome-shell.css'
            );
            this.writeFile(str, shellThemeDir.get_path() + '/gnome-shell/gnome-shell.css');
            str = this.readFile(
                meDir +
                '/resources/' +
                this.accentColor +
                '/gnome-shell/' +
                ShellVersion +
                '/toggle-on.svg'
            );
            this.writeFile(str, shellThemeDir.get_path() + '/gnome-shell/toggle-on.svg');
        } else if (shellThemeDir.query_exists(null)) {
            this.deleteFileDir(shellThemeDir.get_path() + '/gnome-shell/gnome-shell.css');
            this.deleteFileDir(shellThemeDir.get_path() + '/gnome-shell/toggle-on.svg');
            this.deleteFileDir(shellThemeDir.get_path() + '/gnome-shell');
            this.deleteFileDir(shellThemeDir.get_path());
        }
    }
}
