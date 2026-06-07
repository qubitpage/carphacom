"use client"

import { Popover, PopoverPanel, Transition } from "@headlessui/react"
import { ArrowRightMini, XMark } from "@medusajs/icons"
import { Text, clx, useToggleState } from "@medusajs/ui"
import { Fragment } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CountrySelect from "../country-select"
import LanguageSelect from "../language-select"
import { HttpTypes } from "@medusajs/types"
import { Locale } from "@lib/data/locales"

const SideMenuItems = {
  "Acasă": "/",
  "Stații Radio": "/categories/statii-radio",
  "  Stații CB": "/categories/statii-radio-statii-cb",
  "  Stații PMR": "/categories/statii-radio-statii-pmr",
  "  Stații POC": "/categories/statii-radio-statii-poc",
  "  Stații UHF/VHF": "/categories/statii-radio-statii-uhfvhf",
  "  Antene CB": "/categories/statii-radio-antene-cb",
  "  Antene UHF/VHF": "/categories/statii-radio-antene-uhfvhf",
  "  Accesorii Antene": "/categories/statii-radio-accesorii-antene",
  "  Accesorii Stații Radio": "/categories/statii-radio-accesorii-statii-radio",
  "Electronice Auto": "/categories/electronice-auto",
  "Electrice și Electronice": "/categories/electrice-si-electronice",
  "Toate Produsele": "/store",
  "Contul meu": "/account",
  "Coș": "/cart",
}

type SideMenuProps = {
  regions: HttpTypes.StoreRegion[] | null
  locales: Locale[] | null
  currentLocale: string | null
}

const SideMenu = ({ regions, locales, currentLocale }: SideMenuProps) => {
  const countryToggleState = useToggleState()
  const languageToggleState = useToggleState()

  return (
    <div className="h-full">
      <div className="flex items-center h-full">
        <Popover className="h-full flex">
          {({ open, close }) => (
            <>
              <div className="relative flex h-full">
                <Popover.Button
                  data-testid="nav-menu-button"
                  aria-label="Deschide meniul de navigare" className="relative h-full flex items-center gap-2 px-3 py-2 text-dark-300 hover:text-primary-400 transition-all ease-out duration-200 focus:outline-none min-w-[44px] min-h-[44px]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span className="font-medium">Meniu</span>
                </Popover.Button>
              </div>

              {open && (
                <div
                  className="fixed inset-0 z-[50] bg-black/0 pointer-events-auto"
                  onClick={close}
                  data-testid="side-menu-backdrop"
                />
              )}

              <Transition
                show={open}
                as={Fragment}
                enter="transition ease-out duration-150"
                enterFrom="opacity-0"
                enterTo="opacity-100 backdrop-blur-2xl"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 backdrop-blur-2xl"
                leaveTo="opacity-0"
              >
                <PopoverPanel className="flex flex-col absolute w-full pr-4 small:pr-0 small:w-80 small:min-w-min h-[calc(100vh-1rem)] z-[51] inset-x-0 text-sm m-2">
                  <div
                    data-testid="nav-menu-popup"
                    className="flex flex-col h-full bg-dark-900/95 backdrop-blur-xl border border-dark-700 rounded-2xl justify-between p-6 shadow-2xl"
                  >
                    <div className="flex justify-between items-center mb-6" id="xmark">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                          </svg>
                        </div>
                        <span className="text-white font-bold">Meniu</span>
                      </div>
                      <button data-testid="close-menu-button" onClick={close} className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors">
                        <XMark />
                      </button>
                    </div>
                    <ul className="flex flex-col gap-2 items-start justify-start">
                      {Object.entries(SideMenuItems).map(([name, href]) => {
                        return (
                          <li key={name} className="w-full">
                            <LocalizedClientLink
                              href={href}
                              className="flex items-center gap-3 px-4 py-3 text-lg text-dark-200 hover:text-primary-400 hover:bg-dark-800 rounded-xl transition-all duration-200"
                              onClick={close}
                              data-testid={`${name.toLowerCase()}-link`}
                            >
                              <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              {name}
                            </LocalizedClientLink>
                          </li>
                        )
                      })}
                    </ul>
                    <div className="flex flex-col gap-y-6">
                      {!!locales?.length && (
                        <div
                          className="flex justify-between"
                          onMouseEnter={languageToggleState.open}
                          onMouseLeave={languageToggleState.close}
                        >
                          <LanguageSelect
                            toggleState={languageToggleState}
                            locales={locales}
                            currentLocale={currentLocale}
                          />
                          <ArrowRightMini
                            className={clx(
                              "transition-transform duration-150",
                              languageToggleState.state ? "-rotate-90" : ""
                            )}
                          />
                        </div>
                      )}
                      <div
                        className="flex justify-between"
                        onMouseEnter={countryToggleState.open}
                        onMouseLeave={countryToggleState.close}
                      >
                        {regions && (
                          <CountrySelect
                            toggleState={countryToggleState}
                            regions={regions}
                          />
                        )}
                        <ArrowRightMini
                          className={clx(
                            "transition-transform duration-150",
                            countryToggleState.state ? "-rotate-90" : ""
                          )}
                        />
                      </div>
                      <Text className="flex justify-between txt-compact-small text-dark-500">
                        © {new Date().getFullYear()} Stații InfoTrafic
                      </Text>
                    </div>
                  </div>
                </PopoverPanel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
    </div>
  )
}

export default SideMenu
