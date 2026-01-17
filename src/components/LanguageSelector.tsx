import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronDown, Globe } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';

const LanguageSelector: React.FC = () => {
    const { language, setLanguage } = useLanguage();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="flex items-center gap-1 md:gap-3 px-1.5 md:px-3 h-9 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm group"
                >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-colors">
                        <Globe className="w-4 h-4 text-gray-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <span className="text-[14px] font-bold text-gray-800 dark:text-gray-200 hidden md:block">
                        {language === 'en' ? 'English' : 'Kinyarwanda'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-all mr-1 hidden md:block" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px] mt-2 rounded-2xl p-2 shadow-2xl border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in duration-200">
                <DropdownMenuItem
                    onClick={() => setLanguage('en')}
                    className={`rounded-xl px-4 py-2.5 text-sm font-bold cursor-pointer transition-colors ${language === 'en' ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white' : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                >
                    English
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setLanguage('rw')}
                    className={`rounded-xl px-4 py-2.5 text-sm font-bold cursor-pointer transition-colors ${language === 'rw' ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white' : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                >
                    Kinyarwanda
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default LanguageSelector;
