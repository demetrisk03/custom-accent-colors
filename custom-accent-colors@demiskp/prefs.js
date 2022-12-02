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

const {Adw, Gio, GObject, Gtk} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;

class AccentColorSupportPrefsWidget extends Adw.PreferencesPage {
    static {
        GObject.registerClass(this);
    }
    constructor() {
        super();

        this._actionGroup = new Gio.SimpleActionGroup();

        this._settings = ExtensionUtils.getSettings(
            'org.gnome.shell.extensions.custom-accent-colors');

        this._actionGroup.add_action(
            this._settings.create_action('theme-flatpak'));
        this._actionGroup.add_action(
            this._settings.create_action('theme-gtk3'));
        this._actionGroup.add_action(
            this._settings.create_action('theme-shell'));

        this._mainGroup = new Adw.PreferencesGroup();
        this.add(this._mainGroup);
        
        const _listModel = new Gio.ListStore({ item_type: ListAccentColor });
        _listModel.append(new ListAccentColor('Blue (Default)', 'blue'));
        _listModel.append(new ListAccentColor('Green', 'green'));
        _listModel.append(new ListAccentColor('Yellow', 'yellow'));
        _listModel.append(new ListAccentColor('Orange', 'orange'));
        _listModel.append(new ListAccentColor('Red', 'red'));
        _listModel.append(new ListAccentColor('Magenta', 'magenta'));
        _listModel.append(new ListAccentColor('Purple', 'purple'));
        _listModel.append(new ListAccentColor('Brown', 'brown'));
        _listModel.append(new ListAccentColor('Gray', 'gray'));
        this._mainRow = new Adw.ComboRow({
            title: 'Accent Color',
            subtitle: 'Requires Log Out to activate properly.',
            model: _listModel,
            expression: new Gtk.PropertyExpression(ListAccentColor, null, 'name'),
        });
        this._mainGroup.add(this._mainRow);
        this._mainRow.connect('notify::selected-item', () => {
            const { selectedItem } = this._mainRow;
            this._settings.set_string('accent-color', selectedItem.value);
        });
        this._settings.connect('changed::color', () => {
            this._updateSelectedColor();
        });
        this._updateSelectedColor();

        this._extraGroup = new Adw.PreferencesGroup({
            title: ('Extra Options'),
        });
        this.add(this._extraGroup);

        let _toggle = new Gtk.Switch({
            action_name: 'theme-flatpak',
            valign: Gtk.Align.CENTER,
        });
        this._settings.bind('theme-flatpak',
            _toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
        this._extraRow = new Adw.ActionRow({
            title: ('Flatpak Theming'),
            activatable_widget: _toggle,
        });
        this._extraRow.add_suffix(_toggle);
        this._extraGroup.add(this._extraRow);

        _toggle = new Gtk.Switch({
            action_name: 'theme-gtk3',
            valign: Gtk.Align.CENTER,
        });
        this._settings.bind('theme-gtk3',
            _toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
        this._extraRow = new Adw.ActionRow({
            title: ('GTK3 Theming'),
            subtitle: ('Requires the "adw-gtk3" theme.'),
            activatable_widget: _toggle,
        });
        this._extraRow.add_suffix(_toggle);
        this._extraGroup.add(this._extraRow);
        
        _toggle = new Gtk.Switch({
            action_name: 'theme-shell',
            valign: Gtk.Align.CENTER,
        });
        this._settings.bind('theme-shell',
            _toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
        this._extraRow = new Adw.ActionRow({
            title: ('Shell Theming'),
            subtitle: ('Requires the Shell Theme to be set to "CustomAccentColors" with Gnome Tweaks.'),
            activatable_widget: _toggle,
        });
        this._extraRow.add_suffix(_toggle);
        this._extraGroup.add(this._extraRow);
    }

    _updateSelectedColor() {
        const _accentColor = this._settings.get_string('accent-color');
        const { model } = this._mainRow;
        for (let i = 0; i < model.get_n_items(); i++) {
            const _item = model.get_item(i);
            if (_item.value === _accentColor) {
                this._mainRow.set_selected(i);
                break;
            }
        }
    }
}

const ListAccentColor = GObject.registerClass({
      Properties: {
          'name': GObject.ParamSpec.string(
              'name', 'name', 'name',
              GObject.ParamFlags.READWRITE,
              null),
          'value': GObject.ParamSpec.string(
              'value', 'value', 'value',
              GObject.ParamFlags.READWRITE,
              null),
      },
}, class ListAccentColor extends GObject.Object {
      _init(name, value) {
          super._init({ name, value });
      }
});

function init() {
}

function buildPrefsWidget() {
    return new AccentColorSupportPrefsWidget();
}