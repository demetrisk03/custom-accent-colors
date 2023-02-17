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
    enable() {
        this.settings = ExtensionUtils.getSettings(
            'org.gnome.shell.extensions.custom-accent-colors'
        );

        this.accentColor = this.settings.get_string('accent-color');

        this.handlerAccentColor = this.settings.connect('changed::accent-color', () => {
            this.accentColor = this.settings.get_string('accent-color');
            this.updateGtkTheming('gtk-4.0', true, this.accentColor);
            if (this.settings.get_boolean('theme-gtk3')) {
                this.updateGtkTheming('gtk-3.0', true, this.accentColor);
            }
            if (this.settings.get_boolean('theme-shell')) {
                this.updateShellTheming(true, this.accentColor);
            }
        });
        this.handlerFlatpak = this.settings.connect('changed::theme-flatpak', () => {
            this.updateFlatpakTheming(this.settings.get_boolean('theme-flatpak'));
        });
        this.handlerGTK3 = this.settings.connect('changed::theme-gtk3', () => {
            if (this.settings.get_boolean('theme-gtk3')) {
                this.backupUserConfig('gtk-3.0', this.accentColor);
            }
            this.updateGtkTheming(
                'gtk-3.0',
                this.settings.get_boolean('theme-gtk3'),
                this.accentColor
            );
        });
        this.handlerShell = this.settings.connect('changed::theme-shell', () => {
            this.updateShellTheming(this.settings.get_boolean('theme-shell'), this.accentColor);
        });

        this.backupUserConfig('gtk-4.0', this.accentColor);
        this.updateGtkTheming('gtk-4.0', true, this.accentColor);
        if (this.settings.get_boolean('theme-flatpak')) {
            this.updateFlatpakTheming(true);
        }
        if (this.settings.get_boolean('theme-gtk3')) {
            this.backupUserConfig('gtk-3.0', this.accentColor);
            this.updateGtkTheming('gtk-3.0', true, this.accentColor);
        }
        if (this.settings.get_boolean('theme-shell')) {
            this.updateShellTheming(true, this.accentColor);
        }
    }

    disable() {
        this.updateGtkTheming('gtk-4.0', false);
        if (this.settings.get_boolean('theme-flatpak')) {
            this.updateFlatpakTheming(false);
        }
        if (this.settings.get_boolean('theme-gtk3')) {
            this.updateGtkTheming('gtk-3.0', false);
        }

        if (this.handlerAccentColor) {
            this.settings.disconnect(this.handlerAccentColor);
            this.handlerAccentColor = null;
        }
        if (this.handlerFlatpak) {
            this.settings.disconnect(this.handlerFlatpak);
            this.handlerFlatpak = null;
        }
        if (this.handlerGTK3) {
            this.settings.disconnect(this.handlerGTK3);
            this.handlerGTK3 = null;
        }
        if (this.handlerShell) {
            this.settings.disconnect(this.handlerShell);
            this.handlerShell = null;
        }
        this.settings = null;
    }

    createFile(path) {
        try {
            const file = Gio.File.new_for_path(path);
            file.make_directory_with_parents(null);
        } catch (e) {
            log(e);
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
            log(e);
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
            log(e);
        }
    }

    async deleteFile(path) {
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
            log(e);
        }
    }

    backupUserConfig(gtkVer, accentColor) {
        const gtkFile = Gio.File.new_for_path(HomeDir + '/.config/' + gtkVer + '/gtk.css');
        if (gtkFile.query_exists(null)) {
            const str = this.readFile(gtkFile.get_path());
            if (str !== this.readFile(MeDir + '/resources/' + accentColor + '/gtk.css')) {
                this.writeFile(
                    str,
                    HomeDir + '/.config/' + gtkVer + '/gtk-pre-custom-accent-colors.css'
                );
            }
        }
    }

    updateGtkTheming(gtkVer, apply, accentColor) {
        if (apply) {
            const gtkDir = Gio.File.new_for_path(HomeDir + '/.config/' + gtkVer);
            if (!gtkDir.query_exists(null)) {
                this.createFile(gtkDir.get_path());
            }
            const str = this.readFile(MeDir + '/resources/' + accentColor + '/gtk.css');
            this.writeFile(str, HomeDir + '/.config/' + gtkVer + '/gtk.css');
        } else {
            const backupFile = Gio.File.new_for_path(
                HomeDir + '/.config/' + gtkVer + '/gtk-pre-custom-accent-colors.css'
            );
            if (backupFile.query_exists(null)) {
                const str = this.readFile(backupFile.get_path());
                this.writeFile(str, HomeDir + '/.config/' + gtkVer + '/gtk.css');
                this.deleteFile(backupFile.get_path());
            } else {
                this.deleteFile(HomeDir + '/.config/' + gtkVer + '/gtk.css');
            }
        }
    }

    updateFlatpakTheming(apply) {
        if (apply) {
            try {
                GLib.spawn_command_line_async(
                    'flatpak override --user --filesystem=xdg-config/gtk-4.0:ro --filesystem=xdg-config/gtk-3.0:ro'
                );
            } catch (e) {
                logError(e);
            }
        } else {
            try {
                GLib.spawn_command_line_async(
                    'flatpak override --user --nofilesystem=xdg-config/gtk-4.0 --nofilesystem=xdg-config/gtk-3.0'
                );
            } catch (e) {
                logError(e);
            }
        }
    }

    updateShellTheming(apply, accentColor) {
        if (apply) {
            const shellThemeDir = Gio.File.new_for_path(
                HomeDir + '/.local/share/themes/custom-accent-colors/gnome-shell'
            );
            if (!shellThemeDir.query_exists(null)) {
                this.createFile(shellThemeDir.get_path());
            }
            let str = this.readFile(
                MeDir + '/resources/' + accentColor + '/gnome-shell/gnome-shell.css'
            );
            this.writeFile(
                str,
                HomeDir + '/.local/share/themes/custom-accent-colors/gnome-shell/gnome-shell.css'
            );
            str = this.readFile(MeDir + '/resources/' + accentColor + '/gnome-shell/toggle-on.svg');
            this.writeFile(
                str,
                HomeDir + '/.local/share/themes/custom-accent-colors/gnome-shell/toggle-on.svg'
            );
        } else {
            this.deleteFile(
                HomeDir + '/.local/share/themes/custom-accent-colors/gnome-shell/gnome-shell.css'
            );
            this.deleteFile(
                HomeDir + '/.local/share/themes/custom-accent-colors/gnome-shell/toggle-on.svg'
            );
            this.deleteFile(HomeDir + '/.local/share/themes/custom-accent-colors/gnome-shell');
            this.deleteFile(HomeDir + '/.local/share/themes/custom-accent-colors');
        }
    }
}

function init() {
    return new Extension();
}
