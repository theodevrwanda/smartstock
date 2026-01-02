import React from 'react';
import { Settings, Moon, Sun, Languages } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

export const AuthSettings: React.FC = () => {
    const { language, setLanguage, t } = useLanguage();
    const { theme, setTheme } = useTheme();

    return (
        <div className="absolute top-4 right-4 z-50">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                        <Settings className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>{t('settings')}</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Languages className="mr-2 h-4 w-4" />
                            <span>{t('language')}</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => setLanguage('en')} className="justify-between">
                                {t('english')}
                                {language === 'en' && <span>✓</span>}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setLanguage('rw')} className="justify-between">
                                {t('kinyarwanda')}
                                {language === 'rw' && <span>✓</span>}
                            </DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            {theme === 'dark' ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
                            <span>{t('theme')}</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => setTheme('light')} className="justify-between">
                                {t('light_mode')}
                                {theme === 'light' && <span>✓</span>}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme('dark')} className="justify-between">
                                {t('dark_mode')}
                                {theme === 'dark' && <span>✓</span>}
                            </DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};
