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
                  General terms of sale
                </p>
              </div>
            </div>

            {/* Content Card */}
            <div className="rounded-2xl border bg-white shadow-sm p-6 sm:p-8 md:p-10">
              <div className="prose prose-neutral max-w-none">
                <article className="space-y-8">
                  <section>
                    <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Article 1: Scope</h2>
                    <p className="text-neutral-700 leading-relaxed">
                      These general terms apply to all agreements concluded by VZW Vlaamse Technische Kring (Flemish Technical Association). The co-contracting party is deemed to accept them by the mere fact of signing the agreement. Deviations from these terms of sale, even if stated on documents issued by the co-contracting party, are only binding on VTK if they have been confirmed in writing by VTK. In that case, all other terms of sale remain in force except where explicitly deviated from.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Article 2: Formation of the agreement</h2>
                    <div className="space-y-4">
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>2.1.</strong> All oral preliminary discussions are purely informative. The agreement is only formed upon signature of the contract by VZW Vlaamse Technische Kring. Commencement of performance is equated with conclusion of a contract and acceptance of these general terms, unless such performance was carried out under express reservation. Performance is carried out in accordance with the general terms of sale stated in the quotation, contract, purchase order, delivery note, and/or invoice, without application of the co-contracting party’s own terms, even if communicated afterwards.
                      </p>
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>2.2.</strong> Any cancellation of an order must be made in writing. It is only valid subject to written acceptance by VZW Vlaamse Technische Kring. In case of cancellation, the co-contracting party owes a lump-sum fee depending on the subject of the agreement, covering fixed and variable costs and possible loss of profit.
                      </p>
                      <p className="text-neutral-700 leading-relaxed ml-4">
                        <strong>2.2.1.</strong> For Sector Nights, BR Launches, ECC, Internship Fair, Job Fair, or similar events, cancellation up to and including 40 days before the event will incur 35% of the agreed amount; from 39 to 21 days before the event, 60% of the agreed amount; and from 20 days before the event, 100% of that amount will be charged.
                      </p>
                      <p className="text-neutral-700 leading-relaxed ml-4">
                        <strong>2.2.2.</strong> For goods or commitments that, at signing, are not linked to a physical event, cancellation incurs a fee of 35% of the price.
                      </p>
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>2.3</strong> If VZW Vlaamse Technische Kring, except in case of force majeure, cancels an event or order, the company is entitled to full compensation.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Article 3: Price</h2>
                    <p className="text-neutral-700 leading-relaxed">
                      The price is determined at the moment the contract is signed.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Article 4: Delivery</h2>
                    <div className="space-y-4">
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>4.1.</strong> Goods that must be delivered materially (e.g. books, etc.) are sent by post, unless otherwise agreed in writing.
                      </p>
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>4.2.</strong> If the contract grants access to an online database, delivery takes place by providing a username and password.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Article 5: Inspection</h2>
                    <div className="space-y-4">
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>5.1.</strong> The co-contracting party must take receipt of the goods immediately and verify their conformity with the order and any visible defects. If no objection is raised at that time, the co-contracting party acknowledges that delivery is correct and complete and accepts the goods in the condition in which they are delivered.
                      </p>
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>5.2.</strong> Hidden defects can only give rise to compensation if they are notified to VZW Vlaamse Technische Kring within 8 days by registered letter and the goods have not yet been processed.
                      </p>
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>5.3.</strong> The liability of VZW Vlaamse Technische Kring is in any case limited to replacement of defective goods with equivalent goods. VZW Vlaamse Technische Kring is not liable for any other damage of any kind, whether to persons, objects, or the goods themselves.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Article 6: Payment</h2>
                    <div className="space-y-4">
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>6.1.</strong> Unless explicitly stated otherwise on the invoice, the price is payable no later than 30 days after the invoice date.
                      </p>
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>6.2.</strong> If payment is not made by the due date, default interest of 12% shall be owed by operation of law and without prior notice of default, or, if higher, the statutory interest rate determined in accordance with Article 5 of the Act of 2 August 2002 on combating late payment in commercial transactions, as amended by Article 7 of the Act of 22 November 2013.
                      </p>
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>6.3.</strong> If payment is not made by the due date, a flat damages fee of 10% plus a lump sum of €40 for collection costs arising from non-payment shall be owed by operation of law and without prior notice of default, in accordance with Article 6 of the Act of 2 August 2002 on combating late payment in commercial transactions, as amended by Article 8 of the Act of 22 November 2013.
                      </p>
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>6.4.</strong> Incorrect items on the invoice must be reported within 8 days of the invoice date by registered letter. After that period, the invoice is deemed correct and accepted.
                      </p>
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>6.5.</strong> If part of the delivered goods is disputed, the co-contracting party must in any event pay the undisputed portion by the invoice due date.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Article 7: Guarantees</h2>
                    <p className="text-neutral-700 leading-relaxed">
                      If VTK’s confidence in the co-contracting party’s creditworthiness is shaken by enforcement measures against the co-contracting party and/or other demonstrable events that call into question confidence in proper performance of the co-contracting party’s obligations, VTK reserves the right to require appropriate security from the co-contracting party. If the co-contracting party refuses, VTK reserves the right to cancel the entire order or part of it, even if the goods have already been shipped in whole or in part or online access has already been granted. In that case, damages of 35% of the order/agreement amount shall be owed.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Article 8: Industrial and intellectual property</h2>
                    <div className="space-y-4">
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>8.1.</strong> If a good supplied by VTK would infringe a patent, design right, or other industrial or intellectual property rights of third parties, VTK shall, at its option and after consultation with the co-contracting party, replace the good with one that does not infringe the relevant right, obtain a licence, or take back the good against repayment of the price paid, less an amount for wear and/or age. The co-contracting party must in any event inform VTK fully and in good time of third-party claims, on pain of losing the right to the remedies above.
                      </p>
                      <p className="text-neutral-700 leading-relaxed">
                        <strong>8.2.</strong> The co-contracting party is likewise not permitted to reproduce or disclose data to which access is granted or publications made available, by print, photocopy, microfilm, electronic means, audio tape, or any other means, or to store them in a retrieval system without VTK’s prior express written consent.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Article 9: Measures requiring changes to the event</h2>
                    <p className="text-neutral-700 leading-relaxed mb-4">
                      If the subject matter of this agreement is affected by measures taken or imposed by authorities, KU Leuven, or other involved bodies, VTK will always seek to honour the relevant commitment with a view to preserving the event. If such measures make the event impossible, an online alternative will be provided; depending on the type of event, compensation will be provided as follows.
                    </p>
                    <div className="space-y-4">
                      <p className="text-neutral-700 leading-relaxed ml-4">
                        <strong>9.1.</strong> For Sector Nights, BR Launches, or similar events, switching to an online alternative will be compensated by a free option designated by VTK from VTK’s Collaboration Brochure for the academic year in which the contract is valid.
                      </p>
                      <p className="text-neutral-700 leading-relaxed ml-4">
                        <strong>9.2.</strong> For Internship Fair, Job Fair, or similar events, switching to an online alternative will be compensated financially with 25% of the price of the relevant option for which physical presence is required.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Article 10: Force majeure</h2>
                    <p className="text-neutral-700 leading-relaxed">
                      In case of force majeure, VZW Vlaamse Technische Kring has the right to suspend performance of the agreement or to terminate it. In case of force majeure, the co-contracting party expressly waives any claim to damages.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Article 11: Applicable law</h2>
                    <p className="text-neutral-700 leading-relaxed">
                      Belgian law applies exclusively to all agreements concluded by VZW Vlaamse Technische Kring.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Article 12: Disputes</h2>
                    <p className="text-neutral-700 leading-relaxed">
                      Any dispute shall fall under the exclusive jurisdiction of the courts of Leuven.
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
