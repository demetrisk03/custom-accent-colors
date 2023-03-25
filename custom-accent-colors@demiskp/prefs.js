/* prefs.js */

/* exported init buildPrefsWidget */

const { Adw, Gio, GObject, Gtk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;

const CustomAccentColors = GObject.registerClass(
    {
        Properties: {
            name: GObject.ParamSpec.string(
                'name',
                'name',
                'name',
                GObject.ParamFlags.READWRITE,
                null
            ),
            value: GObject.ParamSpec.string(
                'value',
                'value',
                'value',
                GObject.ParamFlags.READWRITE,
                null
            ),
        },
    },
    class CustomAccentColors extends GObject.Object {
        _init(name, value) {
            super._init({ name, value });
        }
    }
);

class CustomAccentColorsPrefsWidget extends Adw.PreferencesPage {
    static {
        GObject.registerClass(this);
    }

    constructor() {
        super();

        this.settings = ExtensionUtils.getSettings(
            'org.gnome.shell.extensions.custom-accent-colors'
        );

        this.mainGroup = new Adw.PreferencesGroup();
        this.add(this.mainGroup);

        const listModel = new Gio.ListStore({ item_type: CustomAccentColors });
        listModel.append(new CustomAccentColors('Default', 'default'));
        listModel.append(new CustomAccentColors('Blue', 'blue'));
        listModel.append(new CustomAccentColors('Green', 'green'));
        listModel.append(new CustomAccentColors('Yellow', 'yellow'));
        listModel.append(new CustomAccentColors('Orange', 'orange'));
        listModel.append(new CustomAccentColors('Red', 'red'));
        listModel.append(new CustomAccentColors('Magenta', 'magenta'));
        listModel.append(new CustomAccentColors('Purple', 'purple'));
        listModel.append(new CustomAccentColors('Brown', 'brown'));
        listModel.append(new CustomAccentColors('Gray', 'gray'));
        this.mainRow = new Adw.ComboRow({
            title: 'Accent Color',
            subtitle:
                'Requires Log Out to activate properly. Any custom "gtk.css" files will be irreversibly overwritten!',
            model: listModel,
            expression: new Gtk.PropertyExpression(CustomAccentColors, null, 'name'),
        });
        this.mainRow.connect('notify::selected-item', () => {
            const { selectedItem } = this.mainRow;
            this.settings.set_string('accent-color', selectedItem.value);
        });
        this.settings.connect('changed::color', () => {
            this.updateSelectedColor();
        });
        this.updateSelectedColor();
        this.mainGroup.add(this.mainRow);

        this.extraGroup = new Adw.PreferencesGroup({
            title: 'Extra Options',
        });
        this.add(this.extraGroup);

        let toggle = new Gtk.Switch({
            action_name: 'theme-flatpak',
            valign: Gtk.Align.CENTER,
        });
        this.settings.bind('theme-flatpak', toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
        let extraRow = new Adw.ActionRow({
            title: 'Flatpak Theming',
            activatable_widget: toggle,
        });
        extraRow.add_suffix(toggle);
        this.extraGroup.add(extraRow);

        toggle = new Gtk.Switch({
            action_name: 'theme-gtk3',
            valign: Gtk.Align.CENTER,
        });
        this.settings.bind('theme-gtk3', toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
        extraRow = new Adw.ActionRow({
            title: 'GTK3 Theming',
            subtitle: 'Requires the "adw-gtk3" Theme.',
            activatable_widget: toggle,
        });
        extraRow.add_suffix(toggle);
        this.extraGroup.add(extraRow);

        toggle = new Gtk.Switch({
            action_name: 'theme-shell',
            valign: Gtk.Align.CENTER,
        });
        this.settings.bind('theme-shell', toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
        extraRow = new Adw.ActionRow({
            title: 'Shell Theming',
            subtitle: 'Requires the Shell Theme to be set to "Custom-Accent-Colors".',
            activatable_widget: toggle,
        });
        extraRow.add_suffix(toggle);
        this.extraGroup.add(extraRow);
    }

    updateSelectedColor() {
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

function init() {}

function buildPrefsWidget() {
    return new CustomAccentColorsPrefsWidget();
}
