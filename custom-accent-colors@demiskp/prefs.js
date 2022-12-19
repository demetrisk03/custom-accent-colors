/* prefs.js
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

const { Adw, Gio, GObject, Gtk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;

class AccentColorSupportPrefsWidget extends Adw.PreferencesPage {
    static {
        GObject.registerClass(this);
    }
    constructor() {
        super();

        this.actionGroup = new Gio.SimpleActionGroup();

        this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.custom-accent-colors');

        this.actionGroup.add_action(this.settings.create_action('theme-flatpak'));
        this.actionGroup.add_action(this.settings.create_action('theme-gtk3'));
        this.actionGroup.add_action(this.settings.create_action('theme-shell'));

        this.mainGroup = new Adw.PreferencesGroup();
        this.add(this.mainGroup);
        
        const listModel = new Gio.ListStore({ item_type: ListAccentColor });
        listModel.append(new ListAccentColor('Blue (Default)', 'blue'));
        listModel.append(new ListAccentColor('Green', 'green'));
        listModel.append(new ListAccentColor('Yellow', 'yellow'));
        listModel.append(new ListAccentColor('Orange', 'orange'));
        listModel.append(new ListAccentColor('Red', 'red'));
        listModel.append(new ListAccentColor('Magenta', 'magenta'));
        listModel.append(new ListAccentColor('Purple', 'purple'));
        listModel.append(new ListAccentColor('Brown', 'brown'));
        listModel.append(new ListAccentColor('Gray', 'gray'));
        listModel.append(new ListAccentColor('Black', 'black'));
        this.mainRow = new Adw.ComboRow({
            title: 'Accent Color',
            subtitle: 'Requires Log Out to activate properly.',
            model: listModel,
            expression: new Gtk.PropertyExpression(ListAccentColor, null, 'name'),
        });
        this.mainGroup.add(this.mainRow);
        this.mainRow.connect('notify::selected-item', () => {
            const { selectedItem } = this.mainRow;
            this.settings.set_string('accent-color', selectedItem.value);
        });
        this.settings.connect('changed::color', () => {
            this.UpdateSelectedColor();
        });
        this.UpdateSelectedColor();

        this.extraGroup = new Adw.PreferencesGroup({
            title: ('Extra Options'),
        });
        this.add(this.extraGroup);

        let toggle = new Gtk.Switch({
            action_name: 'theme-flatpak',
            valign: Gtk.Align.CENTER,
        });
        this.settings.bind('theme-flatpak', toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
        this.extraRow = new Adw.ActionRow({
            title: ('Flatpak Theming'),
            activatable_widget: toggle,
        });
        this.extraRow.add_suffix(toggle);
        this.extraGroup.add(this.extraRow);

        toggle = new Gtk.Switch({
            action_name: 'theme-gtk3',
            valign: Gtk.Align.CENTER,
        });
        this.settings.bind('theme-gtk3', toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
        this.extraRow = new Adw.ActionRow({
            title: ('GTK3 Theming'),
            subtitle: ('Requires the "adw-gtk3" theme.'),
            activatable_widget: toggle,
        });
        this.extraRow.add_suffix(toggle);
        this.extraGroup.add(this.extraRow);
        
        toggle = new Gtk.Switch({
            action_name: 'theme-shell',
            valign: Gtk.Align.CENTER,
        });
        this.settings.bind('theme-shell', toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
        this.extraRow = new Adw.ActionRow({
            title: ('Shell Theming'),
            subtitle: ('Requires the Shell Theme to be set to "CustomAccentColors" with Gnome Tweaks.'),
            activatable_widget: toggle,
        });
        this.extraRow.add_suffix(toggle);
        this.extraGroup.add(this.extraRow);
    }

    UpdateSelectedColor() {
        const accentColor = this.settings.get_string('accent-color');
        const { model } = this.mainRow;
        for (let i = 0; i < model.get_n_items(); i++) {
            const item = model.get_item(i);
            if (item.value === accentColor) {
                this.mainRow.set_selected(i);
                break;
            }
        }
    }
}

const ListAccentColor = GObject.registerClass({
    Properties: {
        'name': GObject.ParamSpec.string('name', 'name', 'name', GObject.ParamFlags.READWRITE, null),
        'value': GObject.ParamSpec.string('value', 'value', 'value', GObject.ParamFlags.READWRITE, null),
    },
},
class ListAccentColor extends GObject.Object {
    _init(name, value) {
        super._init({ name, value });
    }
});

function init() {
}

function buildPrefsWidget() {
    return new AccentColorSupportPrefsWidget();
}
