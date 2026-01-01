'use client'

import { FileText } from "lucide-react"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-vtk-blue/5">
      <div className="min-h-screen py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Header Card */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm mb-8">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="rounded-full bg-vtk-blue/10 p-4">
                    <FileText className="h-12 w-12 text-vtk-blue" />
                  </div>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-2">
                  TERMS AND CONDITIONS OF VTK
                </h1>
                <p className="text-lg text-neutral-700">
                  Verkoopsvoorwaarden
                </p>
              </div>
            </div>

            {/* Content Card */}
            <div className="rounded-2xl border bg-white shadow-sm p-6 sm:p-8 md:p-10">
              <div className="prose prose-neutral max-w-none">
                <article className="space-y-8">
                  <section>
                    <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Artikel 1: Toepassingsgebied</h2>
                    <p className="text-neutral-700 leading-relaxed">
                      Deze algemene voorwaarden gelden voor alle contracten afgesloten door Vlaamse Technische Kring vzw. De medecontractant wordt geacht ze te aanvaarden door het enkel feit van de ondertekening van het contract. Afwijking van deze verkoopsvoorwaarden, zelfs indien vermeld op documenten uitgaande van de medecontractant zijn alleen dan aan Vlaamse Technische Kring vzw tegenstelbaar wanneer zij door Vlaamse Technische Kring vzw schriftelijk werden bevestigd. In dat geval blijven alle overige verkoopsvoorwaarden van kracht waarvan niet uitdrukkelijk werd afgeweken.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Artikel 2: Totstandkoming van het contract</h2>
                    <div className="space-y-4">
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>2.1.</strong> Alle mondelinge voorbesprekingen zijn zuiver informatief. De overeenkomst komt slechts tot stand door ondertekening van het contract door Vlaamse Technische Kring vzw. Een begin van uitvoering wordt gelijkgesteld met de afsluiting van een contract en met aanvaarding van deze algemene voorwaarden tenzij deze uitvoering onder uitdrukkelijk voorbehoud is geschied. De uitvoering ervan geschiedt conform de algemene verkoopsvoorwaarden in de offerte, het contract, de bestelbon, de leveringsnota, en/of de factuur opgenomen, zonder toepassing van de eigen voorwaarden van de medecontractant, zelfs al worden deze naderhand meegedeeld.
                      </p>
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>2.2.</strong> Elke annulering van de bestelling dient schriftelijk te geschieden. Zij is slechts geldig mits schriftelijke aanvaarding door Vlaamse Technische Kring vzw. Ingeval van annulering is de medecontractant een forfaitaire vergoeding verschuldigd afhankelijk van het onderwerp van de overeenkomst, deze dekt de vaste en variabele kosten en mogelijke winstderving.
                      </p>
                      <p className="text-neutral-700 leading-relaxed ml-4">
                        <strong>2.2.1.</strong> Voor Sector Nights, BR Launches, ECC, Internship Fair, Jobfair of gelijkaardige evenementen zal bij een annulatie tot en met 40 dagen voor het evenement 35% van het overeengekomen bedrag aangerekend worden, van 39 tot en met 21 dagen voor het evenement 60% van het overeengekomen bedrag aangerekend worden en vanaf 20 dagen voor het evenement zal 100% van dit bedrag aangerekend worden.
                      </p>
                      <p className="text-neutral-700 leading-relaxed ml-4">
                        <strong>2.2.2.</strong> Voor goederen of engagementen die bij het tekenen van de overeenkomst niet gekoppeld zijn aan een fysiek evenement zal bij annulatie een vergoeding van 35% verschuldigd zijn van de prijs.
                      </p>
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>2.3</strong> In het geval dat Vlaamse Technische Kring vzw, met uitzondering van overmacht, overgaat tot de annulering van een evenement of bestelling, heeft het bedrijf recht op volledige compensatie.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Artikel 3: Prijs</h2>
                    <p className="text-neutral-700 leading-relaxed">
                      De prijs wordt bepaald op het ogenblik van de ondertekening van het contract.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Artikel 4: Levering</h2>
                    <div className="space-y-4">
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>4.1.</strong> De goederen die materieel moeten worden geleverd (vb. boeken, e.d.), worden verstuurd per post, behoudens schriftelijk anders overeengekomen.
                      </p>
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>4.2.</strong> Indien het contract toegang verleent tot een online-databank, heeft de levering plaats door overhandiging van een gebruikersnaam en wachtwoord.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Artikel 5: Controle</h2>
                    <div className="space-y-4">
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>5.1.</strong> De medecontractant dient de goederen onmiddellijk in ontvangst te nemen en na te zien op hun conformiteit met de bestelling en op eventuele zichtbare gebreken. Indien op dat ogenblik niet wordt geprotesteerd, erkent de medecontractant dat de levering juist en volledig is, en aanvaardt hij de goederen in de staat waarin ze zich bevinden.
                      </p>
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>5.2.</strong> Verborgen gebreken kunnen slechts tot vergoeding aanleiding geven indien zij binnen de 8 dagen kenbaar worden gemaakt aan Vlaamse Technische Kring vzw en dit bij aangetekend schrijven en de goederen inmiddels niet in behandeling worden genomen.
                      </p>
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>5.3.</strong> De aansprakelijkheid van Vlaamse Technische Kring vzw is in elk geval beperkt tot de vervanging van de gebrekkige goederen door gelijkwaardige goederen. Vlaamse Technische Kring vzw is niet aansprakelijk voor enige andere schade uit welke hoofde ook, zij het aan personen, voorwerpen of aan de goederen zelf.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Artikel 6: Betalingen</h2>
                    <div className="space-y-4">
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>6.1.</strong> De prijs is - behoudens uitdrukkelijk andersluidende vermelding op de factuur - betaalbaar uiterlijk 30 dagen na factuurdatum.
                      </p>
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>6.2.</strong> Bij niet-betaling op de vervaldag zal van rechtswege en zonder voorafgaande ingebrekestelling een verwijlintrest verschuldigd zijn van 12% of, indien deze hoger is, de wettelijke intrestvoet bepaald overeenkomstig artikel 5 van de wet van 2 augustus 2002 betreffende de bestrijding van de betalingsachterstand bij handelstransacties, gewijzigd door artikel 7 van de wet van 22 november 2013.
                      </p>
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>6.3.</strong> Bij niet-betaling op de vervaldag zal van rechtswege en zonder voorafgaande ingebrekestelling een schadeloosstelling van 10% bovenop een forfaitaire vergoeding van € 40,- voor de invorderingskosten, ontstaan door de niet-betaling, overeenkomstig artikel 6 van de wet van 2 augustus 2002 betreffende de bestrijding van de betalingsachterstand bij handelstransacties, gewijzigd door artikel 8 van de wet van 22 november 2013.
                      </p>
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>6.4.</strong> Verkeerde meldingen op de factuur moeten binnen de 8 dagen na de factuurdatum bij aangetekend schrijven worden meegedeeld. Na afloop van die termijn wordt de factuur geacht juist en aanvaard te zijn.
                      </p>
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>6.5.</strong> In geval van betwisting van een deel van de geleverde goederen is de medecontractant in ieder geval gehouden tot betaling op de vervaldag van de factuur van het niet betwiste gedeelte.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Artikel 7: Waarborgen</h2>
                    <p className="text-neutral-700 leading-relaxed">
                      Indien het vertrouwen van Vlaamse Technische Kring vzw in de kredietwaardigheid van de medecontractant geschokt wordt door daden van gerechtelijke uitvoering tegen de medecontractant en/of aanwijsbare andere gebeurtenissen die het vertrouwen in de goede uitvoering van door de medecontractant aangegane verbintenissen in vraag stellen, dan behoudt Vlaamse Technische Kring vzw zich het recht voor van de medecontractant geschikte waarborgen te eisen. Indien de medecontractant weigert hierop in te gaan, behoudt Vlaamse Technische Kring vzw zich het recht voor de gehele bestelling of een gedeelte ervan te annuleren, zelfs indien de goederen reeds geheel of gedeeltelijk werden verzonden of reeds online toegang werd verleend. In voorkomend geval zal een schadevergoeding verschuldigd zijn à rato van 35% van het bedrag van de bestelling/overeenkomst.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Artikel 8: Industriële en intellectuele eigendom</h2>
                    <div className="space-y-4">
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>8.1.</strong> Indien een door Vlaamse Technische Kring vzw geleverd goed inbreuk zou maken op een octrooi of model recht of op andere rechten van industriële- of intellectuele eigendom van derden, zal Vlaamse Technische Kring vzw naar haar keuze en na overleg met de medecontractant het betreffende goed vervangen door een goed dat geen inbreuk maakt op het betrokken recht of een licentierecht terzake werven, dan wel het goed terugnemen tegen terugbetaling van de betaalde prijs, onder aftrek van een bedrag wegens slijtage en/of ouderdom. De medecontractant dient alleszins Vlaamse Technische Kring vzw tijdig en volledig in te lichten over de aanspraken van derden, op straffe van verlies van het recht op de hierboven vermelde prestaties.
                      </p>
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>8.2.</strong> Het is de medecontractant evenmin toegelaten om de gegevens waartoe toegang wordt verschaft of de publicaties die ter beschikking worden gesteld te verveelvoudigen of openbaar te maken door middel van druk, fotocopie, microfilm, elektronisch, op geluidsband of op welke andere wijze ook en evenmin in een retrieval systeem worden opgeborgen zonder voorafgaandelijke, uitdrukkelijke en schriftelijke toestemming van Vlaamse Technische Kring vzw.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Artikel 9: Maatregelen die ons verplichten tot wijzigen van het evenement</h2>
                    <p className="text-neutral-700 leading-relaxed mb-4">
                      Indien de onderwerpen van deze overeenkomst onderhevig worden aan maatregelen getroffen al dan niet opgelegd door overheden, de KU Leuven of andere betrokken instanties, zal VTK altijd trachten het betrokken engagement na te leven met het oog op het behouden van het evenement. Indien deze maatregelen het evenement niet meer mogelijk maken zal er een online alternatief voorzien worden, afhankelijk van het type evenement zal er een compensatie voorzien worden.
                    </p>
                    <div className="space-y-4">
                      <p className="text-neutral-700 leading-relaxed ml-4">
                        <strong>9.1.</strong> Voor Sector Nights, BR Launches of gelijkaardige evenementen zal bij een overschakeling naar een online alternatief een compensatie geleverd worden in de vorm van een gratis door VTK aangewezen optie uit de door VTK opgestelde Collaboration Brochure van het academiejaar waarin het contract geldig is.
                      </p>
                      <p className="text-neutral-700 leading-relaxed ml-4">
                        <strong>9.2.</strong> Voor Internship Fair, Jobfair of gelijkaardige evenementen zal bij een overschakeling naar een online alternatief een financiële compensatie geleverd worden van 25% van de prijs van de desbetreffende optie waarvoor fysieke aanwezigheid vereist is.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Artikel 10: Overmacht</h2>
                    <p className="text-neutral-700 leading-relaxed">
                      Ingeval van overmacht heeft Vlaamse Technische Kring vzw het recht om de uitvoering van de overeenkomst op te schorten hetzij de overeenkomst te beëindigen. Ingeval van overmacht ziet de medecontractant uitdrukkelijk af van enige schadevergoeding.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Artikel 11: Toepasselijk recht</h2>
                    <p className="text-neutral-700 leading-relaxed">
                      Op alle door Vlaamse Technische Kring vzw afgesloten overeenkomsten zal uitsluitend het Belgisch recht van toepassing zijn.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Artikel 12: Geschillen</h2>
                    <p className="text-neutral-700 leading-relaxed">
                      Ingeval van betwisting zijn uitsluitend de Rechtbanken van Leuven bevoegd.
                    </p>
                  </section>
                </article>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

