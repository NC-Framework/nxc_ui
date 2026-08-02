fx_version 'cerulean'
game 'gta5'

author 'The Nexus Core Framework team'
description 'The shared Nexus Core design system and NUI contracts.'
version '0.1.0'

shared_scripts {
    'shared/*.lua',
}

client_scripts {
    'client/*.lua',
}

files {
    'locales/*.json',
}

dependencies {
    'nxc_lib',
}
