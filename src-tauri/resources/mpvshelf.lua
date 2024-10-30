-- Store the custom title in a user-defined property
mp.set_property("my-custom-title", mp.get_property("title"))

mp.add_hook('on_unload', 0, function()
    -- Print the custom title when the media is unloaded
    local custom_title = mp.get_property("my-custom-title")
    mp.command('print-text ' .. custom_title)
end)

